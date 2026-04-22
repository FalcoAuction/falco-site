import Link from "next/link"
import PrintButton from "../economics/print-button"

export const dynamic = "force-static"
export const metadata = {
  title: "FALCO ↔ Parks Auction & Realty — Pilot Term Sheet",
  description:
    "Non-binding pilot term sheet for the FALCO ↔ Parks Auction & Realty partnership. 3 months, 3 deals, non-exclusive.",
  robots: "noindex, nofollow",
}

// ============================================================================
// PUBLIC shareable term sheet. URL: /pilot/parks/term-sheet
// No auth — Patrick shares the URL with Dale or pastes into the Google Meet
// chat for live walk-through.
// ============================================================================

export default function ParksTermSheetPage() {
  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print bg-[#060606] text-white border-b border-white/[0.08]">
        <div className="mx-auto max-w-4xl px-5 py-3 flex items-center justify-between gap-3">
          <Link
            href="/pilot/parks"
            className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70 hover:text-emerald-200 transition-colors"
          >
            ← Pilot index
          </Link>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/55 hidden sm:block">
            Parks Pilot · Term Sheet
          </div>
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-6 md:px-10 py-10 md:py-14 text-[14px] leading-[1.7]">
        {/* Header */}
        <header className="border-b-2 border-emerald-600 pb-6">
          <div className="text-[11px] tracking-[0.32em] uppercase font-bold text-emerald-700">
            FALCO ↔ Parks Auction &amp; Realty
          </div>
          <h1 className="mt-2 text-[28px] md:text-[32px] font-semibold tracking-tight leading-tight">
            Pilot Term Sheet
          </h1>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
            <Field label="Date" value="April 23, 2026" />
            <Field label="Status" value="PROPOSED · non-binding outline for discussion" />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
            <Field label="Parties" value={
              <>
                <strong>FALCO LLC</strong> (Tennessee)<br />
                <strong>Parks Auction &amp; Realty</strong>
              </>
            } />
            <Field label="Primary contacts" value={
              <>
                Patrick Armour, Founder (FALCO)<br />
                Dale Nichols, Broker / Auctioneer (Parks)
              </>
            } />
          </div>
        </header>

        {/* 1 — Purpose */}
        <Section n="1" title="Purpose">
          <p>
            A 3-month, 3-deal pilot to validate a sourcing-and-routing
            partnership in which FALCO identifies and qualifies distressed
            Tennessee homeowner inventory and Parks runs the marketed real
            estate auction process to disposition.
          </p>
          <p>
            The pilot is intentionally small. The intent is to prove the
            operational model end-to-end on real deals, document the unit
            economics, and use the results to decide whether to formalize a
            longer-term relationship.
          </p>
        </Section>

        {/* 2 — Scope */}
        <Section n="2" title="Pilot scope and timeline">
          <KvTable
            rows={[
              ["Pilot length", "3 months from execution date"],
              ["Minimum deals routed by FALCO", "3 qualified properties"],
              ["Minimum deals listed by Parks", "3 (one-for-one match)"],
              ["Geography", "Tennessee, all 95 counties (Parks-discretionary on coverage)"],
              ["Inventory type", "Single-family residential distressed (pre-foreclosure, lis pendens, post-NOD homeowners)"],
              ["Exclusivity", "Non-exclusive on both sides. Each party may engage other partners."],
            ]}
          />
        </Section>

        {/* 3 — FALCO delivers */}
        <Section n="3" title="What FALCO delivers">
          <p className="!mt-0">For each property routed to Parks, FALCO is responsible for:</p>
          <Ol items={[
            "Distress identification — daily monitoring of trustee notices, lis pendens filings, tax records, and probate courts across all 95 TN counties.",
            "Initial homeowner outreach — first contact, qualification call, education on the marketed-auction option vs. wholesaler / trustee sale alternatives.",
            "Math sheet — written 3-path comparison (trustee sale / wholesaler offer / marketed auction) sized to the property and the homeowner's loan position. Delivered to the homeowner before any listing decision.",
            "Qualified handoff package — for each property routed: owner contact, property address, county, trustee sale date (if any), estimated mortgage balance, lien position summary, valuation estimate, situation notes. Delivered in writing.",
            "Homeowner intake disclosures — privacy, source of contact, FALCO's role and economics. Reviewed by FALCO's counsel.",
          ]} />
          <Note>
            FALCO does not purchase property, broker mortgages, or take a
            seller-side commission.
          </Note>
        </Section>

        {/* 4 — Parks delivers */}
        <Section n="4" title="What Parks delivers">
          <p className="!mt-0">For each property accepted by Parks, Parks is responsible for:</p>
          <Ol items={[
            "Listing decision — review the FALCO handoff package and accept or decline within 5 business days.",
            "Listing agreement — Parks's standard listing paper signed directly with the homeowner.",
            "Marketing campaign — photos, signage, listing site, advertising, MLS where applicable.",
            "30–60 day marketed campaign — defined sale day, open inspection windows, registered bidder list.",
            "Sale-day execution — auction conducted by a Parks-licensed auctioneer.",
            "Buyer-side processing — registration, deposit handling, contract execution, closing coordination.",
            "Lender communication — Parks owns conversations with the foreclosing lender on postponement of trustee sale during the active campaign window.",
          ]} />
          <Note>
            Parks covers all sale-side marketing costs out of the buyer&apos;s
            premium. No marketing or upfront costs are passed to the homeowner
            or to FALCO.
          </Note>
        </Section>

        {/* 5 — Economics */}
        <Section n="5" title="Economics">
          <p className="!mt-0">For each property that closes through Parks under this pilot:</p>
          <KvTable
            rows={[
              ["Buyer's premium", "8% of winning bid, paid by buyer at closing"],
              ["Parks's share", "5% of winning bid (covers Parks's licensing, marketing, auction execution, closing)"],
              ["FALCO's share", "3% of winning bid (covers FALCO's sourcing, homeowner education, math sheet, handoff)"],
              ["Homeowner pays", "$0 to FALCO and $0 to Parks. Homeowner pays only standard closing costs."],
              ["Failed listings", "Neither party owes the other. Both absorb their own costs."],
            ]}
          />
          <p>
            <strong>Payment timing:</strong> FALCO&apos;s 3% is paid at closing,
            wired by Parks within 5 business days of funds clearing.
          </p>
          <p>
            <strong>Buyer&apos;s premium structure rationale:</strong> This is
            the standard real estate auction model — the buyer pays the premium
            on top of their winning bid; the seller (homeowner) sees only the
            bid amount minus loan payoff and standard closing costs. Neither
            party charges the homeowner a commission or a fee.
          </p>
          <Note muted>
            See the live per-deal walkthrough on the{" "}
            <Link href="/pilot/parks/economics" className="text-emerald-700 underline">
              economics one-pager
            </Link>
            .
          </Note>
        </Section>

        {/* 6 — Success metrics */}
        <Section n="6" title="Pilot success metrics">
          <p className="!mt-0">By the end of the 3-month pilot, both parties commit to reviewing:</p>
          <Ol items={[
            "Inventory delivered: how many qualified properties FALCO routed to Parks",
            "Acceptance rate: how many of those Parks chose to list",
            "Closure rate: how many listings successfully closed",
            "Average net to homeowner: real-world equity preserved vs. the modeled 80–88% retail target",
            "Average campaign length: trustee-notice-to-close timeline",
            "Communication quality: turnaround times, handoff package quality, surprise count",
          ]} />
          <p>
            Both parties agree to a <strong>30-min review call at the end of
            month 3</strong> to walk through these metrics and decide on next
            steps.
          </p>
        </Section>

        {/* 7 — Next steps */}
        <Section n="7" title="Possible next steps after pilot">
          <p className="!mt-0">Three paths discussed at the post-pilot review:</p>
          <Ol items={[
            "Formalize: longer-term agreement (12+ months), potentially with regional exclusivity in defined counties, in exchange for committed inventory volume from FALCO.",
            "Continue informally: extend month-to-month with no exclusivity changes, both parties optimize independently.",
            "Wind down: if the model isn't working for either side, both parties walk with no penalty. Open communication on why, no hard feelings.",
          ]} />
        </Section>

        {/* 8 — Operational mechanics */}
        <Section n="8" title="Operational mechanics">
          <KvTable
            rows={[
              ["Handoff format", "Email with structured PDF (FALCO's math sheet) + plain-text summary fields"],
              ["Acceptance window", "5 business days from Parks receiving handoff to accept/decline"],
              ["Decline-to-relist policy", "If Parks declines a property, FALCO retains all rights to route it to other partners or pursue alternative dispositions"],
              ["Communication cadence", "Weekly check-in (15 min) during pilot, async otherwise"],
              ["Lead exclusivity per property", "Once Parks accepts a handoff, FALCO will not route the same property to another auction firm during the active campaign window"],
              ["FALCO inventory commitment", "Best-effort. FALCO will route every qualified property as the data pipeline produces them. No minimum monthly volume guaranteed."],
            ]}
          />
        </Section>

        {/* 9 — Confidentiality */}
        <Section n="9" title="Confidentiality">
          <p className="!mt-0">
            Both parties agree to keep the following confidential during and
            for 12 months after the pilot:
          </p>
          <Ul items={[
            "Per-deal economics and seller identities",
            "The other party's operational processes, software, data sources, partner lists",
            "Any non-public information shared in the course of the pilot",
          ]} />
          <p>
            Either party may publicly disclose the existence of the pilot and
            the headline structure (3 deals, 3 months, marketed auction model)
            without further approval.
          </p>
        </Section>

        {/* 10 — Termination */}
        <Section n="10" title="Termination">
          <p>
            Either party may terminate this pilot for any reason with{" "}
            <strong>14 days written notice</strong> to the other.
          </p>
          <p>
            Properties already under active campaign on the termination date
            complete normally; both parties honor their existing obligations
            through closing.
          </p>
        </Section>

        {/* 11 — Standard */}
        <Section n="11" title="Standard provisions">
          <Ul items={[
            <><strong>Independent contractors.</strong> Nothing in this pilot creates an employment, partnership, joint venture, or franchise relationship between the parties. Each party operates as an independent contractor with its own staff, licenses, and tax obligations.</>,
            <><strong>Compliance.</strong> Each party warrants it holds all licenses required for its scope of work and operates in compliance with applicable Tennessee real estate, auction, and consumer protection law.</>,
            <><strong>Indemnification.</strong> Each party indemnifies the other against claims arising from its own conduct under this pilot.</>,
            <><strong>Governing law.</strong> Tennessee.</>,
            <><strong>Dispute resolution.</strong> Good-faith discussion first. Binding arbitration in Davidson County if unresolved within 30 days.</>,
          ]} />
        </Section>

        {/* 12 — Signatures */}
        <Section n="12" title="Signatures">
          <p>
            This term sheet is non-binding and intended for discussion. A
            definitive agreement will be drafted and executed separately,
            incorporating the terms above as agreed.
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
            <SignBlock name="Patrick Armour, Founder" org="FALCO LLC" />
            <SignBlock name="Dale Nichols, Broker / Auctioneer" org="Parks Auction & Realty" />
          </div>
        </Section>

        {/* Footer */}
        <footer className="mt-12 pt-5 border-t border-neutral-300 text-[11px] text-neutral-500">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>FALCO LLC · Tennessee · falco@falco.llc · falco.llc</div>
            <div>Drafted April 22, 2026</div>
          </div>
        </footer>
      </article>
    </main>
  )
}

// ============================================================================
// Primitives
// ============================================================================

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-[19px] md:text-[20px] font-semibold tracking-tight text-neutral-900">
        <span className="text-emerald-700 mr-3 font-bold tabular-nums">{n}.</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-neutral-800">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-semibold">
        {label}
      </div>
      <div className="mt-1 text-[13px] text-neutral-900 leading-[1.55]">{value}</div>
    </div>
  )
}

function KvTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="border border-neutral-300 rounded overflow-hidden">
      <table className="w-full text-[13px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-neutral-200 last:border-b-0">
              <td className="px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-neutral-500 font-semibold w-[220px] align-top bg-neutral-50">
                {k}
              </td>
              <td className="px-4 py-2.5 text-neutral-900">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Ol({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2 list-decimal pl-5 marker:text-emerald-700 marker:font-semibold">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ol>
  )
}

function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 list-disc pl-5 marker:text-emerald-700">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  )
}

function Note({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`mt-2 rounded border-l-2 px-3 py-2 text-[12px] leading-[1.6] ${
      muted
        ? "border-neutral-300 bg-neutral-50 text-neutral-600"
        : "border-emerald-500 bg-emerald-50 text-emerald-900"
    }`}>
      {children}
    </div>
  )
}

function SignBlock({ name, org }: { name: string; org: string }) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-neutral-900">{name}</div>
      <div className="text-[11px] text-neutral-500">{org}</div>
      <div className="mt-6 h-px bg-neutral-400" />
      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
        Signature · Date
      </div>
    </div>
  )
}
