import { STATUS_LABELS, type DialerStatus } from "@/lib/dialer-types"

export const money = (n: number | null | undefined) =>
  n == null || !Number.isFinite(Number(n)) ? "" : "$" + Math.round(Number(n)).toLocaleString("en-US")
export const compactMoney = (n: number | null | undefined) => {
  const v = Number(n ?? 0)
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M"
  if (v >= 1e3) return "$" + Math.round(v / 1e3) + "k"
  return "$" + Math.round(v)
}
export const titleCase = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase())

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso.slice(0, 10) + "T00:00:00")
  const t = new Date(); t.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - t.getTime()) / 86400000)
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return ""
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  if (mins < 10080) return `${Math.round(mins / 1440)}d ago`
  return shortDate(iso)
}

export function SalePill({ date }: { date: string | null | undefined }) {
  const n = daysUntil(date)
  if (n == null) return null
  if (n < 0) return <span className="pill">Sale passed</span>
  const tone = n <= 7 ? "red" : n <= 21 ? "amber" : ""
  return <span className={`pill ${tone}`}><span className="dot" />{n === 0 ? "Sale today" : `Sale in ${n}d`}</span>
}

const STATUS_TONE: Partial<Record<DialerStatus, string>> = {
  attempting_contact: "blue", rpc_made: "accent", auction_booked: "green", listing_signed: "green",
  auction_live: "green", closed_won: "green", closed_lost: "",
}

export function StatusPill({ status }: { status: DialerStatus | null | undefined }) {
  if (!status || status === "new") return <span className="pill">New</span>
  return <span className={`pill ${STATUS_TONE[status] ?? ""}`}>{STATUS_LABELS[status] ?? status}</span>
}

export function Head({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <header className="crm-head">
      <h1>{title}</h1>
      {sub ? <span className="sub">{sub}</span> : null}
      <span className="spacer" />
      {children}
    </header>
  )
}
