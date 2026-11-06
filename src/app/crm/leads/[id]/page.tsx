// Lead record (Attio-style): key details on the left, actions and the
// activity timeline on the right. Reads one staging row by id plus its
// dialer workflow and activity history.

import Link from "next/link"
import { notFound } from "next/navigation"
import { getLead } from "@/lib/crm-data"
import { CHANNEL_LABELS, OUTCOME_LABELS, NEXT_ACTION_LABELS, distressTypeLabel } from "@/lib/dialer-types"
import { Icon } from "../../icons"
import { Head, SalePill, StatusPill, money, relTime, shortDate, titleCase } from "../../ui"
import { LogForm } from "./log-form"

export const dynamic = "force-dynamic"

function phonesOf(primary: string | null, alternates: unknown): string[] {
  const out: string[] = []
  const add = (p: unknown) => {
    const s = typeof p === "string" ? p : p && typeof p === "object" ? String((p as Record<string, unknown>).phone ?? (p as Record<string, unknown>).number ?? "") : ""
    const d = s.replace(/\D/g, "").slice(-10)
    if (d.length === 10 && !out.includes(d)) out.push(d)
  }
  add(primary)
  if (Array.isArray(alternates)) alternates.forEach(add)
  return out.slice(0, 4)
}
const fmtPhone = (d: string) => `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getLead(id)
  if (!data) notFound()
  const { lead, opp, workflow, activities } = data
  const owner = lead.owner_name_records || lead.full_name
  const phones = phonesOf(lead.phone, lead.alternate_phones)
  const metro = (lead.raw_payload?.metro_parcel ?? null) as Record<string, unknown> | null
  const sale = lead.trustee_sale_date || opp?.sale_date || null
  const situation = opp?.fit_label ?? distressTypeLabel(lead.distress_type).label
  // Some bots write machine notes ("bot_source=x · file#=y"); show only prose.
  const notes = (lead.admin_notes ?? "").split(/\n| · /).filter((s) => s.trim() && !/^[\w#]+=/.test(s.trim())).join("\n")
  const valueSource = lead.property_value_source
    ? ({ metro_parcel: "Metro assessor", xref_avm_enricher: "Estimated", batchdata: "BatchData", attom: "ATTOM" } as Record<string, string>)[lead.property_value_source] ?? "Estimated"
    : null

  return (
    <>
      <Head title={lead.property_address ?? "Lead"}>
        <Link className="crm-btn ghost" href="/crm/leads"><Icon name="back" />Leads</Link>
      </Head>
      <div className="crm-record">
        <aside className="crm-record-side">
          <div>
            <div className="crm-record-title">{lead.property_address ?? "No address"}</div>
            <div className="crm-muted" style={{ marginTop: 2 }}>{titleCase(owner) || "Owner unknown"} · {titleCase(lead.county)}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <StatusPill status={workflow?.status} />
              <span className="pill">{situation}</span>
              <SalePill date={sale} />
            </div>
          </div>

          <div className="crm-actions">
            {phones[0] ? <a className="crm-btn primary" href={`tel:+1${phones[0]}`}><Icon name="calls" />Call</a> : <span className="crm-btn" aria-disabled="true" style={{ opacity: 0.5 }}><Icon name="calls" />No phone</span>}
            {phones[0] ? <a className="crm-btn" href={`sms:+1${phones[0]}`}><Icon name="text" />Text</a> : null}
            {lead.email ? <a className="crm-btn" href={`mailto:${lead.email}`}><Icon name="mail" />Email</a> : null}
            {lead.source_url ? <a className="crm-btn ghost" href={lead.source_url} target="_blank" rel="noreferrer"><Icon name="external" />Source</a> : null}
          </div>

          <div>
            <div className="crm-section-label">Money</div>
            <dl className="crm-props">
              <dt>Value</dt><dd>{money(lead.property_value ?? opp?.property_value) || "Not valued"}{valueSource ? <span className="crm-faint"> · {valueSource}</span> : null}</dd>
              <dt>FALCO fee</dt><dd>{money(opp?.expected_fee) || "Not ranked"}</dd>
              {lead.mortgage_balance ? <><dt>Mortgage</dt><dd>{money(lead.mortgage_balance)}</dd></> : null}
              {opp ? <><dt>Rank</dt><dd>#{opp.rank}</dd></> : null}
            </dl>
          </div>

          <div>
            <div className="crm-section-label">Contact</div>
            <dl className="crm-props">
              <dt>Owner</dt><dd>{titleCase(owner) || "Unknown"}</dd>
              <dt>Phone</dt><dd>{phones.length ? phones.map((p) => <div key={p}><a href={`tel:+1${p}`}>{fmtPhone(p)}</a></div>) : <span className="crm-faint">None. Skip trace is parked until licensed.</span>}</dd>
              {lead.email ? <><dt>Email</dt><dd>{lead.email}</dd></> : null}
              {opp?.contact ? <><dt>Path</dt><dd>{opp.contact}</dd></> : null}
            </dl>
          </div>

          <div>
            <div className="crm-section-label">Property</div>
            <dl className="crm-props">
              <dt>County</dt><dd>{titleCase(lead.county)}</dd>
              {sale ? <><dt>Sale date</dt><dd>{shortDate(sale)}</dd></> : null}
              {lead.year_built ? <><dt>Built</dt><dd>{lead.year_built}</dd></> : null}
              {metro?.land_use ? <><dt>Land use</dt><dd>{titleCase(String(metro.land_use))}</dd></> : null}
              {metro?.owner ? <><dt>Assessor owner</dt><dd>{titleCase(String(metro.owner))}</dd></> : null}
              <dt>Source</dt><dd>{lead.bot_source}</dd>
              <dt>Found</dt><dd>{shortDate(lead.staged_at)}</dd>
            </dl>
          </div>
        </aside>

        <div className="crm-record-main">
          {lead.pipeline_lead_key && workflow ? (
            <LogForm slug={lead.pipeline_lead_key} status={workflow.status} />
          ) : (
            <div className="crm-note">This lead has no pipeline key, so calls cannot be logged against it.</div>
          )}

          {workflow?.nextActionAt ? (
            <div className="crm-note">
              Next: {NEXT_ACTION_LABELS[workflow.nextAction] ?? workflow.nextAction} on {new Date(workflow.nextActionAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          ) : null}

          {notes ? (
            <section className="crm-card">
              <div className="crm-card-head"><h2>What we found</h2></div>
              <div className="crm-card-body" style={{ whiteSpace: "pre-wrap", color: "var(--ink-2)" }}>{notes}</div>
            </section>
          ) : null}

          <section>
            <div className="crm-section-label">Activity</div>
            <ul className="crm-timeline">
              {activities.map((a) => (
                <li key={a.id}>
                  <span className="ico"><Icon name={a.channel === "call" || a.channel === "voicemail" ? "calls" : a.channel === "text" ? "text" : a.channel === "email" ? "mail" : a.channel === "door_knock" ? "door" : "note"} /></span>
                  <div>
                    <span className="what">{CHANNEL_LABELS[a.channel] ?? a.channel}{a.outcome !== "note_only" ? `: ${OUTCOME_LABELS[a.outcome] ?? a.outcome}` : ""}</span>
                    <span className="when">{relTime(a.occurredAt)}{a.createdBy ? ` · ${a.createdBy}` : ""}</span>
                  </div>
                  {a.notes ? <div className="note">{a.notes}</div> : null}
                </li>
              ))}
              <li>
                <span className="ico"><Icon name="leads" /></span>
                <div><span className="what">Found by {lead.bot_source}</span><span className="when">{shortDate(lead.staged_at)}</span></div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  )
}
