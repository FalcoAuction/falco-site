// /admin/staging — staging-table review and bulk-promotion UI.
// Where Patrick verifies new scraper output before it hits the dialer queue.

import Link from "next/link"
import { redirect } from "next/navigation"
import { readAdminSessionFromCookies } from "@/lib/admin-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { StagingClient } from "./staging-client"

export const dynamic = "force-dynamic"

type StagingRow = {
  id: string
  bot_source: string
  scraper_run_id: string | null
  staged_at: string
  staging_status: string
  pipeline_lead_key: string | null
  property_address: string | null
  county: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  property_value: number | null
  trustee_sale_date: string | null
  distress_type: string | null
  admin_notes: string | null
  source_url: string | null
}

type HealthRow = {
  bot_source: string
  status: string
  fetched_count: number
  staged_count: number
  started_at: string
}

async function loadInitialState() {
  if (!supabaseAdmin) return { rows: [], counts: {}, health: [] }

  const { data: rowsData } = await supabaseAdmin
    .from("homeowner_requests_staging")
    .select("*")
    .eq("staging_status", "pending")
    .order("staged_at", { ascending: false })
    .limit(100)

  const { data: aggData } = await supabaseAdmin
    .from("homeowner_requests_staging")
    .select("bot_source, staging_status")
  type AggRow = { bot_source: string; staging_status: string }
  const counts: Record<string, { pending: number; verified: number; rejected: number }> = {}
  for (const r of (aggData as AggRow[]) || []) {
    if (!counts[r.bot_source]) counts[r.bot_source] = { pending: 0, verified: 0, rejected: 0 }
    const s = r.staging_status as "pending" | "verified" | "rejected"
    if (s in counts[r.bot_source]) counts[r.bot_source][s]++
  }

  const { data: healthData } = await supabaseAdmin
    .from("bot_run_health")
    .select("bot_source, status, fetched_count, staged_count, started_at")
    .order("started_at", { ascending: false })
    .limit(20)

  return {
    rows: (rowsData as StagingRow[]) || [],
    counts,
    health: (healthData as HealthRow[]) || [],
  }
}

export default async function StagingPage() {
  const session = await readAdminSessionFromCookies()
  if (!session) redirect("/admin/login?next=/admin/staging")

  const initial = await loadInitialState()

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-amber-400 font-semibold">
              FALCO · STAGING REVIEW
            </div>
            <h1 className="text-2xl font-bold mt-1 sm:text-3xl">
              Verify new scraper output
            </h1>
            <p className="text-sm text-white/55 mt-1">
              New scrapers write here first. Review the data, promote what looks good
              to the live queue, reject the junk.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs text-white/45 hover:text-white/85 underline-offset-2 hover:underline"
          >
            ← admin
          </Link>
        </header>

        <StagingClient initial={initial} />
      </div>
    </main>
  )
}
