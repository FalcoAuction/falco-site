"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  STATUS_LABELS,
  NEXT_ACTION_LABELS,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
  type DialerLead,
  type DialerStatus,
  type DialerNextAction,
  type DialerChannel,
  type DialerOutcome,
  type DialerActivity,
} from "@/lib/dialer-data"

function fmtPhone(raw?: string | null): string {
  if (!raw) return ""
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith("1"))
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return raw
}
function fmtCurrency(n?: number | null): string {
  if (n === null || n === undefined) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}
function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  })
}
function fmtDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function daysToSale(saleIso?: string): number | null {
  if (!saleIso) return null
  const ms = new Date(saleIso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

const STATUS_OPTIONS: DialerStatus[] = [
  "new",
  "attempting_contact",
  "rpc_made",
  "parkes_booked",
  "listing_signed",
  "auction_live",
  "closed_won",
  "closed_lost",
]

const NEXT_ACTION_OPTIONS: DialerNextAction[] = [
  "call",
  "text",
  "wait_callback",
  "hand_to_parkes",
  "drop",
  "none",
]

const CHANNEL_OPTIONS: DialerChannel[] = ["call", "text", "voicemail", "email", "note"]
const OUTCOME_OPTIONS: DialerOutcome[] = [
  "connected",
  "voicemail_left",
  "no_answer",
  "wrong_number",
  "hung_up",
  "booked",
  "callback_requested",
  "not_interested",
  "do_not_call",
  "note_only",
]

export default function LeadDetail({
  lead,
  caller,
}: {
  lead: DialerLead
  caller: string
}) {
  const router = useRouter()
  const dts = daysToSale(lead.currentSaleDate)
  const phones = [
    { label: "Owner Primary", number: lead.ownerPhonePrimary, dnc: lead.ownerPhoneDncStatus },
    { label: "Owner Secondary", number: lead.ownerPhoneSecondary },
    { label: "Sale Controller", number: lead.saleControllerPhonePrimary },
    { label: "Trustee Public", number: lead.trusteePhonePublic },
    { label: "Notice Phone", number: lead.noticePhone },
  ].filter((p) => !!p.number)

  return (
    <>
      {/* Lead header */}
      <header className="mt-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          {lead.address ?? lead.title}
        </h1>
        <div className="mt-1 text-sm text-white/60">
          {lead.ownerName ?? "Unknown owner"} · {lead.county}
        </div>
      </header>

      {/* Quick action / phone block */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="text-[10px] uppercase tracking-wider text-white/45 mb-2">Tap to call</div>
        <div className="flex flex-wrap gap-2">
          {phones.length === 0 && <div className="text-xs text-white/45">No phone on file.</div>}
          {phones.map((p) => (
            <a
              key={p.number}
              href={`tel:${(p.number ?? "").replace(/\D/g, "")}`}
              className="inline-flex flex-col rounded-xl border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-2 transition-colors"
            >
              <span className="text-[10px] uppercase tracking-wider text-emerald-300/80">
                {p.label}
                {p.dnc && p.dnc !== "CLEAR" && (
                  <span className="ml-1.5 text-amber-300/90">[{p.dnc}]</span>
                )}
              </span>
              <span className="text-sm font-medium text-emerald-100">{fmtPhone(p.number)}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Snapshot */}
      <section className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card label="Distress" value={lead.distressType ?? "—"} />
        <Card
          label="Sale Date"
          value={fmtDate(lead.currentSaleDate)}
          tone={dts !== null && dts <= 14 ? "danger" : dts !== null && dts <= 30 ? "warn" : "default"}
          subtitle={dts !== null ? `${dts}d to sale` : ""}
        />
        <Card label="Mortgage" value={fmtCurrency(lead.mortgageAmount)} subtitle={lead.mortgageLender ?? ""} />
        <Card
          label="Equity Band"
          value={lead.equityBand ?? "—"}
          tone={lead.equityBand === "MED" || lead.equityBand === "HIGH" ? "good" : "default"}
        />
      </section>

      {/* Workflow controls */}
      <WorkflowSection lead={lead} caller={caller} onChange={() => router.refresh()} />

      {/* Activity log + form */}
      <ActivitySection lead={lead} caller={caller} onAdded={() => router.refresh()} />

      {/* All FALCO context */}
      <DetailsSection lead={lead} />

      {/* Packet link */}
      {lead.packetUrl && (
        <a
          href={lead.packetUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 mb-12 block rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] p-4 text-center transition-colors"
        >
          <div className="text-[10px] uppercase tracking-wider text-emerald-300/80">
            Full Packet (PDF)
          </div>
          <div className="text-sm text-white mt-1">{lead.packetLabel ?? "Open packet"}</div>
          <div className="text-[11px] text-white/45 mt-1">
            Includes AVM range, equity math, suggested play
          </div>
        </a>
      )}
    </>
  )
}

function Card({
  label,
  value,
  subtitle,
  tone = "default",
}: {
  label: string
  value: string
  subtitle?: string
  tone?: "default" | "good" | "warn" | "danger"
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : tone === "warn"
      ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
      : tone === "danger"
      ? "border-red-400/30 bg-red-400/10 text-red-100"
      : "border-white/10 bg-white/[0.04] text-white"
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
      {subtitle && <div className="text-[11px] opacity-60 mt-0.5 truncate">{subtitle}</div>}
    </div>
  )
}

function WorkflowSection({
  lead,
  caller,
  onChange,
}: {
  lead: DialerLead
  caller: string
  onChange: () => void
}) {
  const [status, setStatus] = useState<DialerStatus>(lead.workflow.status)
  const [nextAction, setNextAction] = useState<DialerNextAction>(lead.workflow.nextAction)
  const [nextActionAt, setNextActionAt] = useState<string>(
    lead.workflow.nextActionAt ? toLocalInput(lead.workflow.nextActionAt) : ""
  )
  const [parkesCallAt, setParkesCallAt] = useState<string>(
    lead.workflow.parkesCallAt ? toLocalInput(lead.workflow.parkesCallAt) : ""
  )
  const [summary, setSummary] = useState<string>(lead.workflow.summaryNotes ?? "")
  const [closedReason, setClosedReason] = useState<string>(lead.workflow.closedLostReason ?? "")
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(false)
    start(async () => {
      const res = await fetch("/api/dialer/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingSlug: lead.slug,
          status,
          nextAction,
          nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
          parkesCallAt: parkesCallAt ? new Date(parkesCallAt).toISOString() : null,
          summaryNotes: summary,
          closedLostReason: status === "closed_lost" ? closedReason : null,
          updatedBy: caller,
        }),
      })
      if (res.ok) {
        setSaved(true)
        onChange()
      }
    })
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/75">
          Workflow
        </h2>
        {saved && <span className="text-[10px] text-emerald-300">Saved ✓</span>}
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DialerStatus)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Next action">
          <select
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value as DialerNextAction)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            {NEXT_ACTION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {NEXT_ACTION_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Next action when">
          <input
            type="datetime-local"
            value={nextActionAt}
            onChange={(e) => setNextActionAt(e.target.value)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          />
        </Field>
        <Field label="Parkes call at">
          <input
            type="datetime-local"
            value={parkesCallAt}
            onChange={(e) => setParkesCallAt(e.target.value)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          />
        </Field>
        {status === "closed_lost" && (
          <Field label="Closed-lost reason" full>
            <input
              type="text"
              value={closedReason}
              onChange={(e) => setClosedReason(e.target.value)}
              placeholder="e.g. owner already in deal, bankruptcy, dnc"
              className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
            />
          </Field>
        )}
        <Field label="Summary notes (overall context)" full>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Big-picture notes that survive across calls — family situation, what they want, what they fear, what to mention next time"
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60 resize-y"
          />
        </Field>
      </div>
      <button
        onClick={save}
        disabled={pending}
        className="mt-3 w-full sm:w-auto rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-semibold text-sm px-4 py-2 transition-colors"
      >
        {pending ? "Saving…" : "Save workflow"}
      </button>
    </section>
  )
}

function ActivitySection({
  lead,
  caller,
  onAdded,
}: {
  lead: DialerLead
  caller: string
  onAdded: () => void
}) {
  const [channel, setChannel] = useState<DialerChannel>("call")
  const [outcome, setOutcome] = useState<DialerOutcome>("connected")
  const [notes, setNotes] = useState("")
  const [nextAction, setNextAction] = useState<DialerNextAction | "">("")
  const [nextAt, setNextAt] = useState("")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await fetch("/api/dialer/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingSlug: lead.slug,
          channel,
          outcome,
          notes,
          nextAction: nextAction || null,
          nextActionAt: nextAt ? new Date(nextAt).toISOString() : null,
          createdBy: caller,
        }),
      })
      if (res.ok) {
        setNotes("")
        setNextAction("")
        setNextAt("")
        onAdded()
      } else {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? "Failed to log activity.")
      }
    })
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-white/75">
        Activity log
      </h2>
      <form onSubmit={submit} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Channel">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as DialerChannel)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Outcome">
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as DialerOutcome)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {OUTCOME_LABELS[o]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes" full>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What was said. Context. Anything Parkes needs to know."
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60 resize-y"
          />
        </Field>
        <Field label="Next action (optional)">
          <select
            value={nextAction}
            onChange={(e) => setNextAction((e.target.value || "") as DialerNextAction | "")}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          >
            <option value="">— no change —</option>
            {NEXT_ACTION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {NEXT_ACTION_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Next action when (optional)">
          <input
            type="datetime-local"
            value={nextAt}
            onChange={(e) => setNextAt(e.target.value)}
            className="w-full rounded-md bg-black/40 border border-white/12 px-2.5 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
          />
        </Field>
        {error && (
          <div className="sm:col-span-2 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-semibold text-sm px-4 py-2 transition-colors"
          >
            {pending ? "Logging…" : "+ Log activity"}
          </button>
        </div>
      </form>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="text-[10px] uppercase tracking-wider text-white/45 mb-2">
          History ({lead.recentActivities.length})
        </div>
        {lead.recentActivities.length === 0 && (
          <div className="text-xs text-white/40 italic py-3">
            No activity yet. Make the first call.
          </div>
        )}
        <ul className="space-y-3">
          {lead.recentActivities.map((a) => (
            <ActivityRow key={a.id} a={a} />
          ))}
        </ul>
      </div>
    </section>
  )
}

function ActivityRow({ a }: { a: DialerActivity }) {
  return (
    <li className="rounded-lg border border-white/8 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs">
          <span className="font-semibold text-white">{CHANNEL_LABELS[a.channel]}</span>
          <span className="mx-1.5 text-white/30">·</span>
          <span className="text-white/75">{OUTCOME_LABELS[a.outcome]}</span>
        </div>
        <div className="text-[11px] text-white/45 whitespace-nowrap">
          {fmtDateTime(a.occurredAt)}
        </div>
      </div>
      {a.notes && <div className="mt-1.5 text-sm text-white/85 whitespace-pre-wrap">{a.notes}</div>}
      <div className="mt-1.5 text-[11px] text-white/40">
        Logged by {a.createdBy || "—"}
        {a.nextAction && (
          <>
            {" · next: "}
            <span className="text-white/60">{NEXT_ACTION_LABELS[a.nextAction]}</span>
            {a.nextActionAt && <> @ {fmtDateTime(a.nextActionAt)}</>}
          </>
        )}
      </div>
    </li>
  )
}

function DetailsSection({ lead }: { lead: DialerLead }) {
  const rows: Array<[string, string]> = [
    ["Address", lead.address ?? "—"],
    ["County", lead.county ?? "—"],
    ["Property type", lead.distressType ?? "—"],
    ["Owner", lead.ownerName ?? "—"],
    ["Owner mailing", lead.ownerMail ?? "—"],
    ["Year built", lead.yearBuilt ? String(Math.floor(lead.yearBuilt)) : "—"],
    ["Sqft / Beds / Baths", `${lead.buildingAreaSqft ? Math.floor(lead.buildingAreaSqft) : "—"} / ${lead.beds ?? "—"} / ${lead.baths ?? "—"}`],
    ["Mortgage lender (current)", lead.mortgageLender ?? "—"],
    ["Mortgage amount", fmtCurrency(lead.mortgageAmount)],
    ["Mortgage date", fmtDate(lead.mortgageDate)],
    ["Last sale date", fmtDate(lead.lastSaleDate)],
    ["Trustee / Sale Controller", lead.saleControllerName ?? "—"],
    ["DNC status (primary)", lead.ownerPhoneDncStatus ?? "—"],
    ["Property ID", lead.propertyIdentifier ?? "—"],
  ]
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-white/75">
        FALCO data
      </h2>
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5">
            <dt className="text-white/55 text-xs">{k}</dt>
            <dd className="text-white/90 text-right truncate">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-[10px] uppercase tracking-wider text-white/55 mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

/** Format an ISO timestamp into a value usable by <input type="datetime-local"> */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`
}
