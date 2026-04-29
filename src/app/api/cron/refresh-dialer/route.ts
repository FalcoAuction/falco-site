// Daily dialer-data refresh cron.
//
// Goal: keep the dialer queue showing fresh data on top of whatever the
// bot pipeline has scraped (GitHub Actions writes raw bot leads daily).
//
// What this does each day:
//   1. Re-runs BatchData skip-trace on bot leads where the phone is
//      stale OR missing (last refreshed >7 days ago, or never)
//   2. Backfills missing AVMs — ATTOM-first (preferred when subscription
//      is active), BatchData as automatic fallback when ATTOM fails or
//      isn't configured
//   3. Logs a summary of what was refreshed AND which source filled each
//
// Source-of-truth precedence for AVMs:
//   property_value_source = 'ATTOM_AVM'      ← preferred (subscription)
//   property_value_source = 'BATCHDATA_AVM'  ← fallback / when ATTOM down
//
// Auth pattern matches the other crons (CRON_SECRET via Bearer).

import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"

const VERIFY_URL = "https://api.batchdata.com/api/v1/address/verify"
const SKIP_TRACE_URL = "https://api.batchdata.com/api/v1/property/skip-trace"
const LOOKUP_URL = "https://api.batchdata.com/api/v1/property/lookup/all-attributes"

// How fresh is "fresh enough"? Skip-trace older than this is re-run.
const STALE_DAYS = 7

// Plain numeric capture groups for TS target compat (no named groups)
const ADDR_FULL = /^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/
const ADDR_LOOSE = /^(.+?)\s+([A-Za-z .'-]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/

function splitAddress(raw: string | null) {
  const text = (raw || "").trim().replace(/\s+/g, " ").replace(/,\s*$/, "")
  if (!text) return null
  const m1 = text.match(ADDR_FULL)
  if (m1) {
    return {
      street: m1[1].trim(),
      city: m1[2].trim(),
      state: m1[3],
      zip: m1[4],
    }
  }
  const m2 = text.match(ADDR_LOOSE)
  if (m2) {
    return {
      street: m2[1].trim(),
      city: m2[2].trim(),
      state: m2[3],
      zip: m2[4],
    }
  }
  return null
}

function rankPhones(
  phones: unknown[]
): { number: string; dnc: boolean; rank: number }[] {
  if (!Array.isArray(phones)) return []
  return phones
    .map((p): { number: string; dnc: boolean; rank: number } | null => {
      if (typeof p !== "object" || p === null) return null
      const obj = p as Record<string, unknown>
      const numRaw = String(obj.number || obj.phone || "").replace(/\D/g, "")
      if (!numRaw || numRaw.length < 10) return null
      const number =
        numRaw.length === 11 && numRaw.startsWith("1") ? numRaw.slice(1) : numRaw
      const score = Number(obj.score) || 0
      const tested = Boolean(obj.tested)
      const reachable = Boolean(obj.reachable)
      const dnc = Boolean(obj.dnc)
      return {
        number,
        dnc,
        rank:
          (dnc ? 0 : 1000) +
          (reachable ? 500 : 0) +
          (tested ? 100 : 0) +
          score,
      }
    })
    .filter((x): x is { number: string; dnc: boolean; rank: number } => x !== null)
    .sort((a, b) => b.rank - a.rank)
}

function rankEmails(emails: unknown[]): string[] {
  if (!Array.isArray(emails)) return []
  return emails
    .map((e): { email: string; score: number } | null => {
      if (typeof e !== "object" || e === null) return null
      const obj = e as Record<string, unknown>
      const addr = String(obj.email || obj.address || "")
        .trim()
        .toLowerCase()
      if (!addr || !addr.includes("@")) return null
      return { email: addr, score: Number(obj.score) || 0 }
    })
    .filter((x): x is { email: string; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.email)
}

type RefreshResult = {
  ok: boolean
  reason?: string
  candidates_skiptrace: number
  candidates_avm: number
  skiptrace_success: number
  skiptrace_no_match: number
  skiptrace_failed: number
  avm_success: number
  avm_via_attom: number
  avm_via_batchdata: number
  avm_failed: number
  budget_used_estimate_usd: number
}

// ---------------------------------------------------------------------------
// ATTOM AVM lookup
//
// Primary source for AVMs when subscription is active. Returns null on any
// failure (auth, timeout, no result) so the caller falls back to BatchData.
// ATTOM's auth is `apikey` header (not Bearer). Address format wants
// address1 = "123 Main St", address2 = "City, ST" (no zip in address2).
// ---------------------------------------------------------------------------

const ATTOM_BASE = "https://api.gateway.attomdata.com/propertyapi/v1.0.0"

async function lookupAttomAvm(
  parts: { street: string; city: string; state: string; zip: string },
  apiKey: string
): Promise<number | null> {
  try {
    const address1 = parts.street.trim()
    const address2 = `${parts.city.trim()}, ${parts.state.trim()}`
    const url =
      `${ATTOM_BASE}/attomavm/detail?` +
      new URLSearchParams({ address1, address2 }).toString()

    const res = await fetch(url, {
      headers: { Accept: "application/json", apikey: apiKey },
    })
    if (!res.ok) {
      // 401 = expired/invalid key. 400 with SuccessWithoutResult = no
      // property found (legitimate miss, not an error). Either way, return
      // null so the caller falls through to BatchData.
      return null
    }
    const json = await res.json()
    // ATTOM returns property[0].avm.amount.value
    const props = json?.property
    if (!Array.isArray(props) || props.length === 0) return null
    const avm = props[0]?.avm?.amount?.value
    if (typeof avm !== "number" || avm <= 0) return null
    return Math.round(avm)
  } catch {
    return null
  }
}

async function runRefresh(): Promise<RefreshResult> {
  const result: RefreshResult = {
    ok: true,
    candidates_skiptrace: 0,
    candidates_avm: 0,
    skiptrace_success: 0,
    skiptrace_no_match: 0,
    skiptrace_failed: 0,
    avm_success: 0,
    avm_via_attom: 0,
    avm_via_batchdata: 0,
    avm_failed: 0,
    budget_used_estimate_usd: 0,
  }

  if (!supabaseAdmin) {
    return { ...result, ok: false, reason: "supabase not configured" }
  }
  const apiKey = (process.env.FALCO_BATCHDATA_API_KEY ?? "").trim()
  const attomKey = (process.env.FALCO_ATTOM_API_KEY ?? "").trim()
  if (!apiKey && !attomKey) {
    return {
      ...result,
      ok: false,
      reason: "neither FALCO_BATCHDATA_API_KEY nor FALCO_ATTOM_API_KEY set",
    }
  }

  const cutoff = new Date(
    Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  // --- Skip-trace stale leads (phone older than STALE_DAYS) -----------
  const { data: skipCandidates, error: skipErr } = await supabaseAdmin
    .from("homeowner_requests")
    .select("id, property_address, owner_name_records, full_name, email, updated_at")
    .eq("source", "bot")
    .lt("updated_at", cutoff)
    .limit(50) // cap per run to control cost
  if (skipErr) {
    return { ...result, ok: false, reason: skipErr.message }
  }
  result.candidates_skiptrace = skipCandidates?.length || 0

  for (const row of skipCandidates || []) {
    const r = row as {
      id: string
      property_address: string | null
      owner_name_records: string | null
      full_name: string | null
      email: string | null
    }
    const parts = splitAddress(r.property_address)
    if (!parts) continue
    try {
      const ownerName = r.owner_name_records || r.full_name || null
      const requestBody: Record<string, unknown> = { propertyAddress: parts }
      if (ownerName) requestBody.ownerName = ownerName

      const res = await fetch(SKIP_TRACE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests: [requestBody] }),
      })
      result.budget_used_estimate_usd += 0.25
      if (!res.ok) {
        result.skiptrace_failed++
        continue
      }
      const json = await res.json()
      const persons = json?.results?.persons
      if (!Array.isArray(persons) || persons.length === 0) {
        result.skiptrace_no_match++
        continue
      }
      const allPhones: unknown[] = []
      const allEmails: unknown[] = []
      for (const person of persons) {
        const ph = (person as Record<string, unknown>).phoneNumbers ||
          (person as Record<string, unknown>).phones || []
        const em = (person as Record<string, unknown>).emails || []
        if (Array.isArray(ph)) allPhones.push(...ph)
        if (Array.isArray(em)) allEmails.push(...em)
      }
      const phones = rankPhones(allPhones)
      const emails = rankEmails(allEmails)
      if (phones.length === 0) {
        result.skiptrace_no_match++
        continue
      }
      const writePayload: Record<string, unknown> = {
        phone: phones[0].number,
        updated_at: new Date().toISOString(),
      }
      if (emails[0] && !r.email) {
        writePayload.email = emails[0]
      }
      const { error: upErr } = await supabaseAdmin
        .from("homeowner_requests")
        .update(writePayload)
        .eq("id", r.id)
      if (upErr) {
        // Try phone-only fallback if unique constraint blocks email write
        const phoneOnly = await supabaseAdmin
          .from("homeowner_requests")
          .update({ phone: phones[0].number, updated_at: new Date().toISOString() })
          .eq("id", r.id)
        if (phoneOnly.error) {
          result.skiptrace_failed++
          continue
        }
      }
      result.skiptrace_success++
    } catch {
      result.skiptrace_failed++
    }

    // Polite pacing
    await new Promise((res) => setTimeout(res, 300))
  }

  // --- Backfill AVM for any leads still missing it ---------------------
  const { data: avmCandidates, error: avmErr } = await supabaseAdmin
    .from("homeowner_requests")
    .select("id, property_address")
    .eq("source", "bot")
    .is("property_value", null)
    .limit(20) // smaller cap — these are usually garbage addresses
  if (avmErr) {
    return result
  }
  result.candidates_avm = avmCandidates?.length || 0

  for (const row of avmCandidates || []) {
    const r = row as { id: string; property_address: string | null }
    const parts = splitAddress(r.property_address)
    if (!parts) continue

    let avm: number | null = null
    let source: "ATTOM_AVM" | "BATCHDATA_AVM" | null = null

    // ----- Pass 1: ATTOM (preferred when subscription active) -----
    if (attomKey) {
      avm = await lookupAttomAvm(parts, attomKey)
      result.budget_used_estimate_usd += 0.05 // ATTOM call cost is much lower than BatchData
      if (avm) source = "ATTOM_AVM"
    }

    // ----- Pass 2: BatchData fallback -----
    if (!avm && apiKey) {
      try {
        const verifyRes = await fetch(VERIFY_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requests: [parts] }),
        })
        result.budget_used_estimate_usd += 0.2
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json()
          const hash = verifyData?.results?.addresses?.[0]?.hash
          if (hash) {
            const lookupRes = await fetch(LOOKUP_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ requests: [{ hash }] }),
            })
            if (lookupRes.ok) {
              const lookup = await lookupRes.json()
              const property = lookup?.results?.properties?.[0] || {}
              const valuation = property.valuation || {}
              const candidate =
                valuation?.estimatedValue ??
                valuation?.value ??
                valuation?.avm ??
                null
              if (candidate && candidate > 0) {
                avm = Math.round(Number(candidate))
                source = "BATCHDATA_AVM"
              }
            }
          }
        }
      } catch {
        /* fall through to fail counter */
      }
    }

    if (!avm || !source) {
      result.avm_failed++
      await new Promise((res) => setTimeout(res, 300))
      continue
    }

    const { error: upErr } = await supabaseAdmin
      .from("homeowner_requests")
      .update({
        property_value: avm,
        property_value_source: source,
        property_value_as_of: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      })
      .eq("id", r.id)
    if (upErr) {
      result.avm_failed++
    } else {
      result.avm_success++
      if (source === "ATTOM_AVM") result.avm_via_attom++
      else result.avm_via_batchdata++
    }

    await new Promise((res) => setTimeout(res, 300))
  }

  return result
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") ?? ""
    const expected = `Bearer ${cronSecret}`
    const querySecret = req.nextUrl.searchParams.get("secret") ?? ""
    if (authHeader !== expected && querySecret !== cronSecret) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      )
    }
  }

  try {
    const result = await runRefresh()
    return NextResponse.json(result)
  } catch (err) {
    console.error("refresh-dialer cron failed:", err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 }
    )
  }
}
