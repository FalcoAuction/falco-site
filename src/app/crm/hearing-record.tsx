import type { knoxvilleEvidence } from "@/lib/knoxville-research"

export function HearingRecord({ evidence: e }: { evidence: NonNullable<ReturnType<typeof knoxvilleEvidence>> }) {
  return <section className="crm-card">
    <h3>{e.agenda ? "Published petition" : "Published hearing result"}</h3>
    <p>Case {e.number} · CLT {e.parcel}</p>
    <p>Hearing {e.hearing} · {e.violations}</p>
    {e.oral ? <>
      <p><strong>Oral ruling</strong> · {e.oral.action} within {e.oral.days} days</p>
      <p><a href={e.oral.url}>Play ruling at {e.oral.timestamp}</a> · <a href={e.oral.archive}>Broadcaster archive</a> · checked {e.oral.checked}</p>
    </> : <p>{e.agenda ? "Hearing outcome unverified." : "Decision document available for review. Current order unverified."}</p>}
    <p>Written order not verified.</p>
    {e.complaint && <p>City complaint status: {e.complaint.status} as of {e.complaint.statusDate} (checked {e.complaint.checkedOn})</p>}
    {e.assessor ? <dl className="crm-props">
      <dt>Tax-roll owner</dt><dd>{e.assessor.owner}</dd>
      <dt>County appraisal ({e.assessor.year})</dt><dd>${e.assessor.value.toLocaleString("en-US")}</dd>
      <dt>County evidence</dt><dd><a href={e.assessor.url}>Knox County Trustee tax bill</a> · checked {e.assessor.checked}</dd>
    </dl> : <p>County owner and appraisal unverified.</p>}
    <p>Sale authority unverified.</p>
    <p><a href={e.url}>Official city {e.agenda ? "agenda" : "results"}</a> · <a href={e.caseUrl}>Official city case detail</a></p>
  </section>
}
