import Link from "next/link"
import { Head, money, titleCase } from "@/app/crm/ui"
import { supabaseAdmin } from "@/lib/supabase-admin"
import {
  PILOT_LANE_LABEL, PILOT_ROUTE_LABEL, dedupeWorklist, fullDate, pilotReview, runwayDays,
  type PilotRoute, type WorklistCard,
} from "@/lib/pilot-review"

// Pilot worklist: every lead carrying the shared review card, by route.
// The first-trace view is one row per owner group with each property under it.

export const dynamic = "force-dynamic"

const ROUTES: PilotRoute[] = ["first_trace_review", "professional_relationship", "research_hold", "removed"]

async function cardsFor(route: PilotRoute): Promise<WorklistCard[]> {
  if (!supabaseAdmin) throw new Error("Database unavailable")
  const out: WorklistCard[] = []
  for (let start = 0; ; start += 200) {
    const { data, error } = await supabaseAdmin.from("homeowner_requests_staging")
      .select("id,county,pilot_review:raw_payload->pilot_review")
      .eq("raw_payload->pilot_review->>route", route)
      .order("id").range(start, start + 199)
    if (error) throw new Error("Unable to load the pilot worklist")
    for (const row of data as { id: string; county: string | null; pilot_review: unknown }[]) {
      const review = pilotReview({ pilot_review: row.pilot_review })
      if (review && review.route === route) out.push({ id: row.id, county: row.county, review })
    }
    if (data.length < 200) break
  }
  return out
}

async function routeCount(route: PilotRoute): Promise<number> {
  if (!supabaseAdmin) return 0
  const { count } = await supabaseAdmin.from("homeowner_requests_staging")
    .select("id", { count: "exact", head: true }).eq("raw_payload->pilot_review->>route", route)
  return count ?? 0
}

export default async function PilotWorklist({ searchParams }: { searchParams: Promise<{ route?: string }> }) {
  const sp = await searchParams
  const route = ROUTES.includes(sp.route as PilotRoute) ? (sp.route as PilotRoute) : "first_trace_review"
  const [cards, counts] = await Promise.all([cardsFor(route), Promise.all(ROUTES.map(routeCount))])
  const groups = dedupeWorklist(cards)
  const properties = groups.reduce((n, g) => n + g.assets.length, 0)
  const showQuestion = route === "first_trace_review" || route === "professional_relationship"
  return (
    <>
      <Head title="Pilot worklist" sub="Five priority lanes, one row per owner group">
        <Link className="crm-btn ghost" href="/crm/leads">Leads</Link>
      </Head>
      <nav className="crm-toolbar" aria-label="Pilot routes">
        {ROUTES.map((r, i) => (
          <Link key={r} href={`/crm/leads/pilot?route=${r}`} aria-current={r === route ? "page" : undefined}>
            {PILOT_ROUTE_LABEL[r]} <span className="crm-faint">{counts[i]}</span>
          </Link>
        ))}
      </nav>
      <p className="crm-muted">
        {groups.length} owner {groups.length === 1 ? "group" : "groups"}, {properties} {properties === 1 ? "property" : "properties"}, from {cards.length} lead {cards.length === 1 ? "record" : "records"}.
        {route === "first_trace_review" ? " Payoff, seller intent and contact details are not verified by this list." : ""}
      </p>
      {groups.length === 0 ? <div className="crm-note">Nothing on this route yet.</div> : null}
      {groups.map((g, gi) => {
        const first = g.assets[0].cards[0].review
        return (
          <section className="crm-card" key={g.ownerGroupKey ?? `solo-${gi}`}>
            <div className="crm-card-head">
              <h2>{titleCase(first.decider.name) || "Decision-maker not identified"}</h2>
              <span className="crm-faint">{g.lanes.map((l) => PILOT_LANE_LABEL[l]).join(" + ")}{g.assets.length > 1 ? ` · ${g.assets.length} properties` : ""}</span>
            </div>
            <div className="crm-card-body">
              {g.assets.map((a, ai) => {
                const lead = a.cards[0], r = lead.review, days = runwayDays(r.economics.deadline)
                const missing = [...r.economics.unknowns, ...r.availability.verifyNext]
                return (
                  <dl className="crm-props" key={a.propertyKey ?? `asset-${ai}`} style={{ marginBottom: 12 }}>
                    <dt>Asset</dt><dd><Link href={`/crm/leads/${lead.id}`}>{r.asset.address || r.asset.parcel || r.asset.description || "Open record"}</Link> · {titleCase(lead.county)}</dd>
                    <dt>Why now</dt><dd>{r.event.what}{r.event.checkedOn ? ` (checked ${fullDate(r.event.checkedOn)})` : ""}</dd>
                    <dt>Signer</dt><dd>{r.decider.role}{r.decider.verified ? "" : " · not verified"}<div className="crm-faint">{r.decider.basis}</div></dd>
                    <dt>Deadline</dt><dd>{r.economics.deadline ? `${fullDate(r.economics.deadline)}${days !== null ? ` · ${days < 0 ? "passed" : `${days} days`}` : ""}` : "Unknown"}</dd>
                    <dt>{r.economics.valueIsEstimate ? "Estimated value" : "Value"}</dt><dd>{r.economics.value !== null ? money(r.economics.value) : "Not valued"}{r.economics.valueBasis ? <span className="crm-faint"> · {r.economics.valueBasis}</span> : null}</dd>
                    {missing.length ? <><dt>Missing</dt><dd>{missing.join("; ")}</dd></> : null}
                    {showQuestion ? <><dt>Ask first</dt><dd>{r.availability.firstCallQuestion}</dd></> : <><dt>Reason</dt><dd>{r.routeReason}</dd></>}
                    {a.cards.length > 1 ? <><dt>Also in</dt><dd>{a.cards.slice(1).map((c) => <span key={c.id}><Link href={`/crm/leads/${c.id}`}>{PILOT_LANE_LABEL[c.review.lane]}</Link> </span>)}</dd></> : null}
                  </dl>
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
