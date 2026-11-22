import { cityStatusLabel, chattanoogaParcel, assessorSource, parcelHoldLabel } from "@/lib/chattanooga-research"
import { metroLabel } from "@/lib/nashville-codes"
import { employmentDate, warnAsset, warnWorksite, warnDocuments } from "@/lib/warn-evidence"
import { landEvidence } from "@/lib/land-evidence"
// Lead record (Attio-style): key details on the left, actions and the
// activity timeline on the right. Reads one staging row by id plus its
// dialer workflow and activity history.

import Link from "next/link"
import { notFound } from "next/navigation"
import { PP_LANE_LABEL, addressText, getLead, mathSheetIdFor, type AircraftTag, type LaneTag, type OperatorContents, type PersonalPropertyTag } from "@/lib/crm-data"
import { CHANNEL_LABELS, OUTCOME_LABELS, NEXT_ACTION_LABELS, distressTypeLabel } from "@/lib/dialer-types"
import { Icon } from "@/app/crm/icons"
import { Head, SalePill, StatusPill, money, relTime, shortDate, titleCase } from "@/app/crm/ui"
import { LogForm } from "./log-form"
import { SheetThumb } from "./sheet-thumb"
import MathSheetContent from "@/app/crm/math-sheet/[id]/math-sheet-content"
import { loadHomeownerSnapshot } from "@/app/crm/math-sheet/[id]/load-snapshot"
import { ContentsForm } from "./contents-form"

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
  const cityCase = lead.raw_payload?.chattanooga_codes as { case_number?: string } | undefined
  const chatt = lead.bot_source === "chattanooga_codes" ? chattanoogaParcel({
    ...lead, case_number: cityCase?.case_number, parcelReview: lead.raw_payload?.chattanooga_parcel_review,
  }) : null
  const mathSheetId = chatt || lead.bot_source === "warn_notices" ? null : await mathSheetIdFor(lead.pipeline_lead_key)
  const sheet = mathSheetId ? await loadHomeownerSnapshot(mathSheetId) : null
  const owner = chatt ? chatt.assessor?.owner : lead.bot_source === "warn_notices" ? lead.full_name : lead.owner_name_records || lead.full_name
  const laneTag = chatt || lead.bot_source === "warn_notices" ? null : (lead.raw_payload?.property_lane ?? null) as LaneTag | null
  const warn = warnAsset(lead, lead.raw_payload ?? {})
  const parcel = warn && lead.county?.toLowerCase() === "davidson" && warnWorksite(lead.raw_payload ?? {})
  const aircraft = (!warn && Array.isArray(lead.raw_payload?.aircraft) ? lead.raw_payload?.aircraft : []) as AircraftTag[]
  const pp = warn ?? (lead.raw_payload?.personal_property ?? null) as PersonalPropertyTag | null
  const probate = lead.raw_payload?.probate_review as { stage?: string; contact_hold?: boolean;
    attorney_draft_status?: string; attorney_draft_hold_reasons?: string[] } | undefined
  const land = landEvidence(lead, { origin: lead.raw_payload?.source, lane: lead.raw_payload?.property_lane, land: lead.raw_payload?.land, roll: lead.raw_payload?.comptroller_parcel })
  const researchLand = land !== null && !land.corroborated
  const metroHeld = !!data.metroDisposition && data.metroDisposition !== "open"
  const attrs = (lead.raw_payload?.nashville_codes ?? {}) as Record<string, unknown>
  const review = (lead.raw_payload?.nashville_codes_review ?? {}) as Record<string, unknown>
  const request = String(attrs.Request_Nbr ?? "").trim()
  const caseLink = "https://services2.arcgis.com/HdTo6HJqh92wn4D8/arcgis/rest/services/Property_Standards_Violations_2/FeatureServer/0/query?f=pjson&outFields=Request_Nbr,Status,Property_Address,Property_APN,Violations_Noted,Reported_Problem&returnGeometry=false&where=" +
    encodeURIComponent("Request_Nbr='" + request.replaceAll("'", "''") + "'").replaceAll("'", "%27")
  const ownerContactHeld = !!chatt || !!warn || metroHeld || (lead.bot_source === "nashville_codes" && review.owner_changed === true) || !!data.noticeHold || probate?.contact_hold === true || pp?.routable === false
  const contents = (lead.raw_payload?.operator_contents ?? null) as OperatorContents | null
  const phones = phonesOf(lead.phone, [...(Array.isArray(lead.alternate_phones) ? lead.alternate_phones : []), ...(laneTag?.phones ?? [])])
  const metro = (lead.raw_payload?.metro_parcel ?? null) as Record<string, unknown> | null
  const sale = chatt || warn ? null : metroHeld || data.noticeHold || researchLand ? null : lead.trustee_sale_date || opp?.sale_date || null
  const situation = chatt ? "Chattanooga code research" : warn ? "TN WARN employment notice" : data.noticeHold === "stale_notice" ? "Stale trustee notice · verify sale" : data.noticeHold ?? (data.metroDisposition ? metroLabel(data.metroDisposition) : null) ?? (researchLand ? "Land ownership research" : null) ?? opp?.fit_label ?? distressTypeLabel(lead.distress_type).label
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
            {ownerContactHeld ? null : phones[0] ? <a className="crm-btn primary" href={`tel:+1${phones[0]}`}><Icon name="calls" />Call</a> : <span className="crm-btn" aria-disabled="true" style={{ opacity: 0.5 }}><Icon name="calls" />No phone</span>}
            {!ownerContactHeld && phones[0] ? <a className="crm-btn" href={`sms:+1${phones[0]}`}><Icon name="text" />Text</a> : null}
            {!ownerContactHeld && lead.email ? <a className="crm-btn" href={`mailto:${lead.email}`}><Icon name="mail" />Email</a> : null}
            {lead.source_url ? <a className="crm-btn ghost" href={lead.source_url} target="_blank" rel="noreferrer"><Icon name="external" />Source</a> : null}
          </div>

          <div>
            {chatt ? <><div className="crm-section-label">Chattanooga case {cityCase?.case_number}</div>
              <dl className="crm-props">
                <dt>City case status</dt><dd>{cityStatusLabel(lead.city_review)}</dd>
                {Array.isArray(lead.city_review?.official_statuses) && <><dt>City status codes</dt><dd>{lead.city_review.official_statuses.join(", ")}</dd></>}
                {lead.city_review?.checked_on && <><dt>City review date</dt><dd>{lead.city_review.checked_on}</dd></>}
              </dl>
              {chatt.assessor ? <dl className="crm-props">
                <dt>County parcel</dt><dd>{chatt.assessor.parcel}</dd>
                <dt>County appraisal</dt><dd>{chatt.assessor.value === null ? "Unverified" : money(chatt.assessor.value)}</dd>
                <dt>County file stamp</dt><dd>{chatt.assessor.stamp}</dd>
                <dt>Source</dt><dd><a href={assessorSource} target="_blank" rel="noreferrer">Hamilton County assessor export</a></dd>
              </dl> : <p>{parcelHoldLabel(chatt.parcelStatus)}</p>}
              <Link href="/crm/leads/chattanooga">Active Chattanooga case research</Link>
            </> : warn ? <><div className="crm-section-label">Employment notice</div>
              <dl className="crm-props"><dt>Employment notice date(s)</dt><dd>{employmentDate(lead.raw_payload ?? {})}</dd>
                {warnDocuments(lead.raw_payload ?? {}).map(doc => <div key={doc.label + doc.detail + doc.source}>
                  <dt>{doc.label}</dt><dd><a href={doc.source} target="_blank" rel="noreferrer">{doc.detail}</a> {doc.date}</dd></div>)}
              </dl>
              {parcel && <><div className="crm-section-label">County worksite record</div>
                <dl className="crm-props">{(parcel.previous || parcel.checkedOn) && <><dt>{parcel.previous ? "Previous parcel observation" : "Parcel checked"}</dt><dd>{parcel.checkedOn || "Date unavailable"}</dd></>}
                  <dt>Worksite</dt><dd>{parcel.address}</dd>
                  <dt>Parcel</dt><dd>{parcel.parcel}</dd><dt>Recorded property owner</dt><dd>{parcel.owner}</dd>
                  <dt>County appraisal</dt><dd>{parcel.appraisal === null ? "Unspecified" : money(parcel.appraisal)}</dd>
                  <dt>Land use</dt><dd>{parcel.landUse || "Unspecified"}</dd>
                  <dt>Source</dt><dd><a href={parcel.url} target="_blank" rel="noreferrer">Davidson County parcel record</a></dd></dl></>}
            </> : <><div className="crm-section-label">Money</div>
            <dl className="crm-props">
              <dt>Value</dt><dd>{money(lead.property_value ?? opp?.property_value) || "Not valued"}{valueSource ? <span className="crm-faint"> · {valueSource}</span> : null}</dd>
              <dt>FALCO fee</dt><dd>{money(opp?.expected_fee) || "Not ranked"}</dd>
              {lead.mortgage_balance ? <><dt>Mortgage</dt><dd>{money(lead.mortgage_balance)}</dd></> : null}
              {opp ? <><dt>Rank</dt><dd>{opp.rank > 100000 ? `FL #${opp.rank - 100000}` : `#${opp.rank}`}</dd></> : null}
            </dl></>}
          </div>

          <div>
            <div className="crm-section-label">Contact</div>
            <dl className="crm-props">
              <dt>{warn ? "Employer" : "Owner"}</dt><dd>{titleCase(owner) || "Unknown"}</dd>
              <dt>Phone</dt><dd>{phones.length ? phones.map((p) => <div key={p}>{ownerContactHeld ? fmtPhone(p) : <a href={`tel:+1${p}`}>{fmtPhone(p)}</a>}</div>) : <span className="crm-faint">None. Skip trace is parked until licensed.</span>}</dd>
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

          {mathSheetId && sheet ? (
            <div>
              <div className="crm-section-label">Math sheet</div>
              <SheetThumb href={`/crm/math-sheet/${mathSheetId}`}>
                <MathSheetContent homeowner={sheet} embed layout="simple2" />
              </SheetThumb>
            </div>
          ) : null}

          {data.metroDisposition && <div>
            <div className="crm-section-label">Metro property standards case</div>
            <dl className="crm-props">
              <dt>Case</dt><dd>{request ? <a href={caseLink} target="_blank" rel="noopener noreferrer">{request}</a> : "Unknown"}</dd>
              <dt>Disposition</dt><dd>{metroLabel(data.metroDisposition)}</dd>
              <dt>Last checked</dt><dd>{String(review.checked_on || "Unverified")}</dd>
              <dt>Official status at check</dt><dd>{String(review.official_status || "Unresolved")}</dd>
              <dt>Recorded property</dt><dd>{String(attrs.Property_Address || "Unknown")}</dd>
              <dt>Recorded APN</dt><dd>{String(attrs.Property_APN || "Unknown")}</dd>
              <dt>Recorded citation</dt><dd>{String(attrs.Violations_Noted || "None recorded")}</dd>
              {attrs.Reported_Problem ? <><dt>Reported complaint</dt><dd>{String(attrs.Reported_Problem)}</dd></> : null}
              {review.owner_changed === true && <><dt>Owner</dt><dd>Metro owner changed; verify current ownership.</dd></>}
            </dl>
          </div>}
          {land && <div>
            <div className="crm-section-label">Land ownership evidence</div>
            <dl className="crm-props">
              <dt>Qualification</dt><dd>{land.corroborated ? "Corroborated opportunity" : "Research only"}</dd>
              <dt>Parcel</dt><dd style={{ whiteSpace: "pre-wrap" }}>{land.parcel || "Unverified"}</dd>
              <dt>Recorded ownership</dt><dd>{land.owner || "Unverified"}</dd>
              {land.signals.length > 0 && <><dt>Ownership signals</dt><dd>{land.signals.join(", ").replaceAll("_", " ")}</dd></>}
              <dt>Acquisition status</dt><dd>{land.acquisitionStatus || "Unknown"}</dd>
              {land.observed && <><dt>Observed</dt><dd>{land.observed}</dd></>}
              {land.sourceDate && <><dt>Source refreshed</dt><dd>{land.sourceDate}</dd></>}
              {land.source && <><dt>Ownership source</dt><dd><a href={land.source} target="_blank" rel="noopener noreferrer">Open record</a></dd></>}
              {land.events.map((event, i) => <div key={i} style={{ display: "contents" }}>
                <dt>Independent record</dt><dd>{event.label}
                  {event.caseId && <div>Case {event.caseId}</div>}
                  <div style={{ whiteSpace: "pre-wrap" }}>{event.parcel} · {event.status.replaceAll("_", " ")}</div>
                  {event.party && <div>Recorded party {event.party}</div>}
                  {event.method && <div>Assessor match by {event.method.replaceAll("_", " ")}</div>}
                  {event.published && <div>Published {event.published}</div>}
                  {event.sale && <div>Listed sale date {event.sale}</div>}
                  {event.rejection && <div>{event.rejection}</div>}
                  {event.reviewSource && <a href={event.reviewSource} target="_blank" rel="noopener noreferrer">Disposition source</a>}
                  {event.source && <div><a href={event.source} target="_blank" rel="noopener noreferrer">Open evidence</a></div>}
                </dd>
              </div>)}
              <dt>Sale authority</dt><dd>Unverified by land evidence</dd>
              <dt>Outreach eligibility</dt><dd>Unverified by land evidence</dd>
              {land.reasons.length > 0 && <><dt>Review reasons</dt><dd>{land.reasons.join(", ").replaceAll("_", " ")}</dd></>}
            </dl>
          </div>}
          {!researchLand && laneTag && (laneTag.lane === "commercial" || laneTag.lane === "land") ? (
            <div>
              <div className="crm-section-label">{laneTag.lane === "land" ? "Land deal" : "Commercial"}</div>
              <dl className="crm-props">
                <dt>Grade</dt><dd>{laneTag.grade ? <span className={`pill ${laneTag.grade === "A" ? "green" : laneTag.grade === "B" ? "blue" : ""}`}>{laneTag.grade}</span> : <span className="crm-faint">{laneTag.exclude_reason ? `Excluded: ${laneTag.exclude_reason.replace(/_/g, " ")}` : "Ungraded"}</span>}</dd>
                {laneTag.subtype ? <><dt>Type</dt><dd>{titleCase(laneTag.subtype.replace(/_/g, " "))}</dd></> : null}
                {laneTag.acres ? <><dt>Acres</dt><dd>{Number(laneTag.acres).toFixed(2)}</dd></> : null}
                {laneTag.value ? <><dt>Assessed</dt><dd>{money(laneTag.value)}</dd></> : null}
                {laneTag.owner_type ? <><dt>Owner type</dt><dd>{titleCase(laneTag.owner_type.replace(/_/g, " "))}</dd></> : null}
                {laneTag.mailing ? <><dt>Owner mails</dt><dd>{laneTag.mailing}{laneTag.out_of_state_owner ? <span className="pill amber" style={{ marginLeft: 6 }}>Out of state</span> : null}</dd></> : null}
                {laneTag.stacked_distress?.length ? <><dt>Stacked</dt><dd>{laneTag.stacked_distress.map((s) => s.replace(/_/g, " ")).join(", ")}</dd></> : null}
                {laneTag.land_flip ? <><dt>Flip score</dt><dd>{laneTag.land_flip.score}{laneTag.land_flip.signals?.length ? <div className="crm-faint">{laneTag.land_flip.signals.map((s) => s.replace(/_/g, " ")).join(", ")}</div> : null}</dd></> : null}
                {laneTag.basis ? <><dt>Based on</dt><dd className="crm-muted">{laneTag.basis}</dd></> : null}
              </dl>
            </div>
          ) : null}

          {aircraft.length ? (
            <div>
              <div className="crm-section-label">High-value assets</div>
              {aircraft.map((a) => (
                <dl key={a.n_number} className="crm-props" style={{ marginBottom: 10 }}>
                  <dt>Aircraft</dt><dd>{a.aircraft} <span className="crm-faint">{a.n_number}</span></dd>
                  <dt>Value</dt><dd>{a.value_band_label}</dd>
                  <dt>Registrant</dt><dd>{titleCase(a.registrant)}<div className="crm-faint">{a.registrant_address}</div></dd>
                  {a.match_type ? <><dt>Matched by</dt><dd>{a.match_type.replace(/_/g, " ")}{a.confidence ? ` (${a.confidence})` : ""}</dd></> : null}
                  {a.registration_status ? <><dt>Registration</dt><dd>{a.registration_status}</dd></> : null}
                </dl>
              ))}
            </div>
          ) : null}

          {probate && <div>
            <div className="crm-section-label">Estate review</div>
            <dl className="crm-props">
              {probate.stage && <><dt>Notice stage</dt><dd>{probate.stage.replaceAll("_", " ")}</dd></>}
              {probate.contact_hold && <><dt>Seller contact</dt><dd>On hold pending authority verification</dd></>}
              {probate.attorney_draft_status && <><dt>Attorney research</dt><dd>{probate.attorney_draft_status.replaceAll("_", " ")}
                {probate.attorney_draft_hold_reasons?.map(reason => <div key={reason}>{reason.replaceAll("_", " ")}</div>)}</dd></>}
            </dl>
          </div>}
          {pp ? (
            <div>
              <div className="crm-section-label">{PP_LANE_LABEL[pp.lane] ?? "Personal property"}</div>
              <dl className="crm-props">
                {pp.grade && <><dt>Grade</dt><dd><span className={`pill ${pp.grade === "A" ? "green" : "blue"}`}>{pp.grade}</span></dd></>}
                {pp.routable !== undefined ? <><dt>Route</dt><dd>{pp.routable ? <span className="pill green">Routes to {pp.route_to}</span> : <><span className="pill amber">Not routable</span><div className="crm-faint">{pp.holds?.length ? null : pp.not_routable_reason}</div></>}</dd></> : null}
                {pp.qualification && <><dt>Qualification</dt><dd>{pp.qualification.replaceAll("_", " ")}</dd></>}
                {pp.holds?.length ? <><dt>Holds</dt><dd>{pp.holds.map(h => <div key={h}>{h}</div>)}</dd></> : null}
                {pp.registry_assets?.length ? <><dt>Registry assets</dt><dd>{pp.registry_assets.map((asset, i) =>
                  <div key={i}>{[asset.n_number, asset.aircraft, asset.registrant].filter(Boolean).join(" · ")}</div>)}</dd></> : null}
                {pp.authority_review?.controller?.authority && <><dt>Authority review</dt><dd>{[pp.authority_review.controller.name,
                  pp.authority_review.controller.role, pp.authority_review.controller.authority].filter(Boolean).join(" · ")}</dd></>}
                {pp.next_action && <><dt>Next action</dt><dd>{pp.next_action}</dd></>}
                {pp.controller ? <><dt>Controls sale</dt><dd>{pp.controller}</dd></> : null}
                {pp.primary_contact ? <><dt>Start with</dt><dd>{pp.primary_contact}</dd></> : null}
                {pp.deadline ? <><dt>Deadline</dt><dd>{pp.deadline}</dd></> : null}
                {pp.categories?.length ? <><dt>Likely</dt><dd>{pp.categories.map((c) => c.replace(/_/g, " ")).join(", ")}</dd></> : null}
                {pp.est_value_min ? <><dt>Est. value</dt><dd>{money(pp.est_value_min)}+ <span className="crm-faint">rough</span></dd></> : null}
                {pp.value_basis ? <><dt>Value basis</dt><dd className="crm-faint">{pp.value_basis}</dd></> : null}
                <dt>Why</dt><dd>{pp.signals.map((s, i) => <div key={i} className="crm-muted">{s}</div>)}</dd>
                {pp.caveats?.length ? <><dt>Check</dt><dd>{pp.caveats.map((c, i) => <div key={i} className="crm-faint">{c}</div>)}</dd></> : null}
                {pp.contacts?.attorney?.names?.length ? <><dt>Attorney</dt><dd>{pp.contacts.attorney.names.join(", ")}{pp.contacts.attorney.address?.length ? <div className="crm-faint">{addressText(pp.contacts.attorney.address)}</div> : null}</dd></> : null}
                {pp.contacts?.representatives?.length ? <><dt>Executor</dt><dd>{pp.contacts.representatives.map((r) => <div key={r.name}>{r.name}{r.address?.length ? <div className="crm-faint">{addressText(r.address)}</div> : null}</div>)}</dd></> : null}
                {pp.contacts?.owner ? <><dt>Owner</dt><dd>{pp.contacts.owner}</dd></> : null}
                {pp.contacts?.marina ? <><dt>Marina</dt><dd>{pp.contacts.marina.name}{pp.contacts.marina.address ? <div className="crm-faint">{pp.contacts.marina.address}</div> : null}</dd></> : null}
                {pp.contacts?.trustee ? <><dt>Trustee</dt><dd>{pp.contacts.trustee.name}{pp.contacts.trustee.phone ? <div><a href={`tel:${pp.contacts.trustee.phone.replace(/[^\d+]/g, "")}`}>{pp.contacts.trustee.phone}</a></div> : null}{pp.contacts.trustee.email ? <div className="crm-faint">{pp.contacts.trustee.email}</div> : null}</dd></> : null}
                {pp.contacts?.counsel?.length ? <><dt>Counsel</dt><dd>{pp.contacts.counsel.map((c) => <div key={c.name}>{c.name}{c.firm ? <span className="crm-faint"> · {c.firm}</span> : null}{c.phone ? <div><a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a></div> : null}{c.email ? <div className="crm-faint">{c.email}</div> : null}</div>)}</dd></> : null}
                {pp.contacts?.plaintiff ? <><dt>Plaintiff</dt><dd>{pp.contacts.plaintiff}</dd></> : null}
                {pp.contacts?.probate_docket ? <><dt>Docket</dt><dd>{pp.contacts.probate_docket}</dd></> : null}
                {pp.contacts?.bankruptcy_docket ? <><dt>Case</dt><dd><a href={pp.contacts.bankruptcy_docket} target="_blank" rel="noreferrer">{pp.contacts.case_number ?? "Docket"}</a></dd></> : null}
              </dl>
            </div>
          ) : null}
        </aside>

        <div className="crm-record-main">
          {lead.pipeline_lead_key && workflow ? (
            <LogForm slug={lead.pipeline_lead_key} status={workflow.status} />
          ) : (
            <div className="crm-note">This lead has no pipeline key, so calls cannot be logged against it.</div>
          )}

          <ContentsForm id={lead.id} initial={contents} />

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
