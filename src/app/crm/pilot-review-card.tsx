import { money } from "@/app/crm/ui"
import { PILOT_DEBT_LABEL, PILOT_LANE_LABEL, PILOT_ROUTE_LABEL, fullDate, runwayDays, type PilotReview, type PilotSource } from "@/lib/pilot-review"

// One card, five questions, the same for every pilot lane.

function Source({ source }: { source: PilotSource | null }) {
  if (!source) return <span className="crm-faint">No source recorded</span>
  const dated = source.date ? ` (${fullDate(source.date)})` : ""
  return source.url
    ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}{dated}</a>
    : <span className="crm-muted">{source.label}{dated}</span>
}

const ROUTE_PILL: Record<PilotReview["route"], string> = {
  first_trace_review: "green", professional_relationship: "blue", research_hold: "amber", removed: "",
}

export function PilotReviewCard({ review }: { review: PilotReview }) {
  const { event, asset, decider, economics, availability } = review
  const days = runwayDays(economics.deadline)
  const runway = days === null ? "No deadline established" : days < 0 ? `Passed ${-days} days ago` : days === 0 ? "Today" : `${days} days left`
  return (
    <section className="crm-card">
      <div className="crm-card-head">
        <h2>Pilot review · {PILOT_LANE_LABEL[review.lane]}</h2>
        <span className={`pill ${ROUTE_PILL[review.route]}`}>{PILOT_ROUTE_LABEL[review.route]}</span>
      </div>
      <div className="crm-card-body">
        <p style={{ marginTop: 0 }}>{review.routeReason}</p>
        {availability.firstCallQuestion && review.route !== "removed" ? (
          <p><strong>Ask first:</strong> {availability.firstCallQuestion}</p>
        ) : null}

        <div className="crm-section-label">1. What happened</div>
        <dl className="crm-props">
          <dt>Event</dt><dd>{event.what || "Not recorded"}</dd>
          <dt>Status</dt><dd>{event.status}{event.checkedOn ? ` · checked ${fullDate(event.checkedOn)}` : " · check date not recorded"}</dd>
          <dt>Source</dt><dd><Source source={event.source} /></dd>
        </dl>

        <div className="crm-section-label">2. Which asset</div>
        <dl className="crm-props">
          <dt>Asset</dt><dd>{asset.description || "Not recorded"}</dd>
          {asset.address ? <><dt>Address</dt><dd>{asset.address}</dd></> : null}
          <dt>Parcel</dt><dd style={{ whiteSpace: "pre-wrap" }}>{asset.parcel || "Not identified"}</dd>
          <dt>Tied to the event by</dt><dd>{asset.tie || "Not established"}</dd>
          <dt>Source</dt><dd><Source source={asset.source} /></dd>
        </dl>

        <div className="crm-section-label">3. Who can decide</div>
        <dl className="crm-props">
          <dt>Person or signer</dt><dd>{decider.name || "Not identified"}</dd>
          <dt>Role</dt><dd>{decider.role || "Unknown"}{decider.verified ? "" : " · not verified"}</dd>
          <dt>Based on</dt><dd>{decider.basis || "Not established"}</dd>
          <dt>Source</dt><dd><Source source={decider.source} /></dd>
        </dl>

        <div className="crm-section-label">4. Time and money</div>
        <dl className="crm-props">
          <dt>Deadline</dt><dd>{economics.deadline ? `${fullDate(economics.deadline)}${economics.deadlineKind ? ` · ${economics.deadlineKind}` : ""}` : "Unknown"}</dd>
          <dt>Runway</dt><dd>{runway}</dd>
          <dt>{economics.valueIsEstimate ? "Estimated value" : "Value"}</dt>
          <dd>{economics.value !== null ? money(economics.value) : "Not valued"}{economics.valueBasis ? <div className="crm-faint">{economics.valueBasis}</div> : null}</dd>
          {economics.value !== null ? <><dt>Value source</dt><dd><Source source={economics.valueSource} /></dd></> : null}
          {economics.knownDebt.map((d, i) => (
            <div key={i} style={{ display: "contents" }}>
              <dt>{PILOT_DEBT_LABEL[d.kind] ?? "Other debt"}</dt>
              <dd>{d.amount !== null ? money(d.amount) : "Amount unknown"}{d.as_of ? ` as of ${fullDate(d.as_of)}` : ""}
                {d.note ? <div className="crm-faint">{d.note}</div> : null}
                <div><Source source={d.source} /></div></dd>
            </div>
          ))}
          {economics.knownDebt.length === 0 ? <><dt>Known debt</dt><dd>None recorded</dd></> : null}
          <dt>Still unknown</dt><dd>{economics.unknowns.length ? economics.unknowns.map((u) => <div key={u}>{u}</div>) : "Nothing listed"}</dd>
        </dl>

        <div className="crm-section-label">5. Is it still available</div>
        <dl className="crm-props">
          <dt>Evidence</dt><dd>{availability.evidence || "Not checked"}{availability.checkedOn ? ` · checked ${fullDate(availability.checkedOn)}` : ""}</dd>
          {availability.conflicts.length ? <><dt>Conflicts</dt><dd>{availability.conflicts.map((c) => <div key={c}>{c}</div>)}</dd></> : null}
          {availability.verifyNext.length ? <><dt>Verify next</dt><dd>{availability.verifyNext.map((v) => <div key={v}>{v}</div>)}</dd></> : null}
        </dl>
        <p className="crm-faint" style={{ marginBottom: 0 }}>
          Reviewed by {review.manual ? "Patrick (manual decision)" : review.reviewedBy || "unknown"}{review.reviewedAt ? ` on ${fullDate(review.reviewedAt)}` : ""}.
          Payoff, seller intent and contact details are not established by this review unless stated above.
        </p>
      </div>
    </section>
  )
}
