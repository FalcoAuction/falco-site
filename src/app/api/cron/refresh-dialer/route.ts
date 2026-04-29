// Daily dialer-data refresh cron.
//
// Goal: keep the dialer queue showing fresh data even though the bot
// pipeline runs locally on Patrick's machine.
//
// What this does each day:
//   1. Re-runs BatchData skip-trace on bot leads where the phone is
//      stale OR missing (last refreshed >7 days ago, or never)
//   2. Re-runs BatchData property enrichment on leads still missing AVM
//   3. Logs a summary of what was refreshed
//
// What this does NOT do:
//   - Pull NEW leads from the bot scrapers (those run locally; Patrick
//     has to run `python -m src.run_all` + `python sync_to_vault.py`
//     from C:/code/falco-distress-bots to add new leads)
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
  avm_failed: number
  budget_used_estimate_usd: number
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
    avm_failed: 0,
    budget_used_estimate_usd: 0,
  }

  if (!supabaseAdmin) {
    return { ...result, ok: false, reason: "supabase not configured" }
  }
  const apiKey = (process.env.FALCO_BATCHDATA_API_KEY ?? "").trim()
  if (!apiKey) {
    return { ...result, ok: false, reason: "FALCO_BATCHDATA_API_KEY not set" }
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
      if (!verifyRes.ok) {
        result.avm_failed++
        continue
      }
      const verifyData = await verifyRes.json()
      const hash = verifyData?.results?.addresses?.[0]?.hash
      if (!hash) {
        result.avm_failed++
        continue
      }
      const lookupRes = await fetch(LOOKUP_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests: [{ hash }] }),
      })
      if (!lookupRes.ok) {
        result.avm_failed++
        continue
      }
      const lookup = await lookupRes.json()
      const property = lookup?.results?.properties?.[0] || {}
      const valuation = property.valuation || {}
      const avm =
        valuation?.estimatedValue ?? valuation?.value ?? valuation?.avm ?? null
      if (!avm || avm <= 0) {
        result.avm_failed++
        continue
      }
      const { error: upErr } = await supabaseAdmin
        .from("homeowner_requests")
        .update({
          property_value: Math.round(Number(avm)),
          property_value_source: "BATCHDATA_AVM",
          property_value_as_of: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.id)
      if (upErr) {
        result.avm_failed++
        continue
      }
      result.avm_success++
    } catch {
      result.avm_failed++
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
