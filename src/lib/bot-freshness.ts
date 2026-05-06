import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * Bot freshness check — surfaces in /admin so we know at a glance
 * which scrapers haven't run recently. The daily.yml workflow fires
 * the bot pipeline twice a day (7am + 4pm CST), so anything older
 * than ~28 hours has missed at least two scheduled runs and warrants
 * attention.
 */

const BOTS_TO_TRACK = [
  "nashville_codes",
  "memphis_codes",
  "chattanooga_codes",
  "knoxville_poh",
  "tn_public_notice",
  "tn_foreclosure_notices",
  "tn_probate",
  "tn_tax_delinquent",
  "api_tax_delinquent",
  "hamilton_tax_delinquent",
  "ustitlesearch_rod",
  "hmda_enricher",
  "auto_promoter",
] as const

export type BotFreshness = {
  bot: string
  lastRunAt: string | null
  hoursSince: number | null
  status: string | null
  staged: number | null
  isStale: boolean
}

const STALE_HOURS = 28

export async function getBotFreshness(): Promise<BotFreshness[]> {
  if (!supabaseAdmin) return []

  // Latest row per bot_source. Get the last 200 rows then dedupe in memory —
  // simpler than Postgres DISTINCT ON for our small set.
  const { data, error } = await supabaseAdmin
    .from("bot_run_health")
    .select("bot_source, started_at, status, staged_count")
    .order("started_at", { ascending: false })
    .limit(200)

  if (error || !data) return []

  const seen = new Set<string>()
  const latest: Map<string, {
    started_at: string
    status: string | null
    staged_count: number | null
  }> = new Map()

  for (const row of data) {
    const bot = row.bot_source as string
    if (!bot || seen.has(bot)) continue
    seen.add(bot)
    latest.set(bot, {
      started_at: row.started_at as string,
      status: (row.status as string | null) ?? null,
      staged_count: (row.staged_count as number | null) ?? null,
    })
  }

  const now = Date.now()
  return BOTS_TO_TRACK.map((bot) => {
    const meta = latest.get(bot)
    if (!meta) {
      return {
        bot,
        lastRunAt: null,
        hoursSince: null,
        status: null,
        staged: null,
        isStale: true, // never run = treat as stale
      }
    }
    const hoursSince = (now - new Date(meta.started_at).getTime()) / (1000 * 60 * 60)
    return {
      bot,
      lastRunAt: meta.started_at,
      hoursSince: Math.round(hoursSince * 10) / 10,
      status: meta.status,
      staged: meta.staged_count,
      isStale: hoursSince > STALE_HOURS,
    }
  })
}

/** Count how many tracked bots are stale. Used to decide whether to
 *  show the red banner in /admin. */
export function countStaleBots(rows: BotFreshness[]): number {
  return rows.filter((r) => r.isStale).length
}
