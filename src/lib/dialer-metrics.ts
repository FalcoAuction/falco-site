import {
  listAllRecentActivities,
  listAllWorkflows,
  type DialerActivity,
  type DialerWorkflow,
} from "@/lib/dialer-data"
import { loadDialerInventory, type DialerInventoryLead } from "@/lib/dialer-inventory"

export type ChannelCounts = {
  call: number
  text: number
  voicemail: number
  email: number
  note: number
  door_knock: number
  flyer_left: number
}

export type OutcomeCounts = {
  connected: number
  voicemail_left: number
  no_answer: number
  wrong_number: number
  hung_up: number
  booked: number
  callback_requested: number
  not_interested: number
  do_not_call: number
  note_only: number
}

export type ActivityWindow = {
  totalActivities: number
  dialAttempts: number // non-note channels
  rpcs: number // connected or booked outcomes
  bookings: number // booked outcome
  closedLost: number // do_not_call or not_interested outcome
  byChannel: ChannelCounts
  byOutcome: OutcomeCounts
  byCaller: Record<string, number>
}

export type DialerMetrics = {
  generatedAt: string
  today: ActivityWindow
  last7days: ActivityWindow
  status: {
    new: number
    attempting_contact: number
    rpc_made: number
    auction_booked: number
    listing_signed: number
    auction_live: number
    closed_won: number
    closed_lost: number
  }
  totalLeads: number
  callableLeads: number // not closed
  dueToday: DialerLeadSummary[]
  overdue: DialerLeadSummary[]
  stuck: DialerLeadSummary[]
  recentActivities: ActivityWithLead[]
}

export type DialerLeadSummary = {
  key: string
  address: string
  county: string
  ownerName: string
  phone: string
  distressType: string
  status: DialerWorkflow["status"]
  nextAction: DialerWorkflow["nextAction"]
  nextActionAt: string | null
  lastContactAt: string | null
  attemptCount: number
  summaryNotes: string
  stuckDays?: number
}

export type ActivityWithLead = DialerActivity & {
  address: string
  ownerName: string
  county: string
}

const EMPTY_WINDOW = (): ActivityWindow => ({
  totalActivities: 0,
  dialAttempts: 0,
  rpcs: 0,
  bookings: 0,
  closedLost: 0,
  byChannel: { call: 0, text: 0, voicemail: 0, email: 0, note: 0, door_knock: 0, flyer_left: 0 },
  byOutcome: {
    connected: 0,
    voicemail_left: 0,
    no_answer: 0,
    wrong_number: 0,
    hung_up: 0,
    booked: 0,
    callback_requested: 0,
    not_interested: 0,
    do_not_call: 0,
    note_only: 0,
  },
  byCaller: {},
})

function summarize(activities: DialerActivity[]): ActivityWindow {
  const w = EMPTY_WINDOW()
  for (const a of activities) {
    w.totalActivities += 1
    w.byChannel[a.channel] += 1
    w.byOutcome[a.outcome] += 1
    const caller = (a.createdBy || "unknown").trim() || "unknown"
    w.byCaller[caller] = (w.byCaller[caller] ?? 0) + 1
    if (a.channel !== "note") w.dialAttempts += 1
    if (a.outcome === "connected" || a.outcome === "booked") w.rpcs += 1
    if (a.outcome === "booked") w.bookings += 1
    if (a.outcome === "do_not_call" || a.outcome === "not_interested") w.closedLost += 1
  }
  return w
}

function leadIndex(inventory: DialerInventoryLead[]): Map<string, DialerInventoryLead> {
  const idx = new Map<string, DialerInventoryLead>()
  for (const l of inventory) {
    if (l.key) idx.set(l.key, l)
    if (l.slug && l.slug !== l.key) idx.set(l.slug, l)
    if (l.vaultSlug && l.vaultSlug !== l.slug) idx.set(l.vaultSlug, l)
    if (l.leadKey && l.leadKey !== l.key) idx.set(l.leadKey, l)
  }
  return idx
}

function summarizeLead(
  slug: string,
  workflow: DialerWorkflow,
  inv: Map<string, DialerInventoryLead>
): DialerLeadSummary {
  const lead = inv.get(slug)
  return {
    key: slug,
    address: lead?.address ?? "(unknown address)",
    county: lead?.county ?? "",
    ownerName: lead?.ownerName ?? "",
    phone: lead?.ownerPhonePrimary ?? lead?.ownerPhoneSecondary ?? "",
    distressType: lead?.distressType ?? "",
    status: workflow.status,
    nextAction: workflow.nextAction,
    nextActionAt: workflow.nextActionAt ?? null,
    lastContactAt: workflow.lastContactAt ?? null,
    attemptCount: workflow.attemptCount ?? 0,
    summaryNotes: workflow.summaryNotes ?? "",
  }
}

export async function computeDialerMetrics(): Promise<DialerMetrics> {
  const [snapshot, activities, workflowsMap] = await Promise.all([
    loadDialerInventory(),
    listAllRecentActivities(500),
    listAllWorkflows(),
  ])

  const inventory = snapshot?.leads ?? []
  const invIdx = leadIndex(inventory)
  const now = Date.now()
  const dayAgo = now - 24 * 60 * 60 * 1000
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000

  const todayActs = activities.filter((a) => new Date(a.occurredAt).getTime() >= dayAgo)
  const weekActs = activities.filter((a) => new Date(a.occurredAt).getTime() >= weekAgo)

  const status = {
    new: 0,
    attempting_contact: 0,
    rpc_made: 0,
    auction_booked: 0,
    listing_signed: 0,
    auction_live: 0,
    closed_won: 0,
    closed_lost: 0,
  }
  let callable = 0
  const CLOSED = new Set(["closed_won", "closed_lost"])

  // Leads known to the dialer = inventory + any workflow rows (operator may have
  // taken action on a lead that's since dropped out of inventory; still count it)
  const allSlugs = new Set<string>()
  for (const l of inventory) allSlugs.add(l.key)
  for (const slug of workflowsMap.keys()) allSlugs.add(slug)

  const due: DialerLeadSummary[] = []
  const overdue: DialerLeadSummary[] = []
  const stuck: DialerLeadSummary[] = []
  const startOfToday = new Date()
  startOfToday.setHours(23, 59, 59, 999)
  const endOfTodayMs = startOfToday.getTime()
  const threeDaysAgoMs = now - 3 * 24 * 60 * 60 * 1000

  for (const slug of allSlugs) {
    const wf = workflowsMap.get(slug)
    // "Status" for a lead without any workflow row is effectively "new"
    const s = wf?.status ?? "new"
    if (s in status) status[s as keyof typeof status] += 1
    if (!CLOSED.has(s)) callable += 1
    if (!wf) continue

    if (wf.nextActionAt && !CLOSED.has(wf.status)) {
      const actAt = new Date(wf.nextActionAt).getTime()
      if (actAt <= endOfTodayMs) {
        const sum = summarizeLead(slug, wf, invIdx)
        if (actAt < now) overdue.push(sum)
        else due.push(sum)
      }
    }

    // "Stuck" = attempting_contact or rpc_made with last contact >3 days ago
    if (
      (wf.status === "attempting_contact" || wf.status === "rpc_made") &&
      wf.lastContactAt
    ) {
      const lastMs = new Date(wf.lastContactAt).getTime()
      if (lastMs < threeDaysAgoMs) {
        const sum = summarizeLead(slug, wf, invIdx)
        sum.stuckDays = Math.round((now - lastMs) / (24 * 60 * 60 * 1000))
        stuck.push(sum)
      }
    }
  }

  // Recent activities (last 50) decorated with lead info
  const recent: ActivityWithLead[] = activities.slice(0, 50).map((a) => {
    const lead = invIdx.get(a.listingSlug)
    return {
      ...a,
      address: lead?.address ?? "(lead no longer in inventory)",
      ownerName: lead?.ownerName ?? "",
      county: lead?.county ?? "",
    }
  })

  // Sort due + overdue by nextActionAt; stuck by stuckDays
  due.sort((a, b) => (a.nextActionAt ?? "").localeCompare(b.nextActionAt ?? ""))
  overdue.sort((a, b) => (a.nextActionAt ?? "").localeCompare(b.nextActionAt ?? ""))
  stuck.sort((a, b) => (b.stuckDays ?? 0) - (a.stuckDays ?? 0))

  return {
    generatedAt: new Date().toISOString(),
    today: summarize(todayActs),
    last7days: summarize(weekActs),
    status,
    totalLeads: allSlugs.size,
    callableLeads: callable,
    dueToday: due,
    overdue,
    stuck,
    recentActivities: recent,
  }
}
