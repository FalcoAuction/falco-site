// Types and constants shared between the admin server code and the
// admin client component.
//
// These used to live in admin-leads.ts, which imports supabase-admin.
// Because LEAD_STATUSES is a runtime value (not a type), the client
// component importing it pulled that whole server module — including
// the service-role client construction — into the browser bundle. The
// key itself was never exposed (Next.js only inlines NEXT_PUBLIC_*),
// but it shipped dead server code to every admin visitor and would
// have become a real leak the moment anyone renamed the variable.
// Keeping the shared surface server-free removes that failure mode.

export type LeadKind = "homeowner" | "pipeline" | "buyer" | "partner" | "inquiry"

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "listed"
  | "closed"
  | "lost"

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "listed",
  "closed",
  "lost",
]

export type Lead = {
  id: string
  kind: LeadKind
  submittedAt: string // ISO
  email: string
  name: string
  /** Compact one-line subtitle for the table row. */
  summary: string
  /** Full details map for the expanded view. */
  details: Array<{ label: string; value: string }>
  // Workflow fields (added by the admin_lead_workflow migration)
  status: LeadStatus
  notes: string
  nextActionAt: string | null
  lastContactedAt: string | null
}

export type LeadsBundle = {
  /** Form-submitted homeowner requests (source = 'form'). Hot — they came to us. */
  homeowners: Lead[]
  /** Bot-pulled distress leads (source = 'bot'). The FALCO pipeline queue. */
  pipeline: Lead[]
  buyers: Lead[]
  partners: Lead[]
  inquiries: Lead[]
  totals: {
    homeowners: number
    pipeline: number
    buyers: number
    partners: number
    inquiries: number
    total: number
  }
  /** Counts of submissions in the last 24h, for the dashboard banner. */
  last24h: {
    homeowners: number
    pipeline: number
    buyers: number
    partners: number
    inquiries: number
    total: number
  }
  /** True if Supabase isn't configured (admin should still render an empty state). */
  unavailable?: boolean
}
