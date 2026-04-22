import Link from "next/link"
import PrintButton from "../../pilot/parks/economics/print-button"

export const dynamic = "force-static"
export const metadata = {
  title: "FALCO — Dialer / Closer Role",
  description:
    "What the FALCO dialer/closer role actually is — the work, the tools, the numbers, and what success looks like.",
  robots: "noindex, nofollow",
}

// ============================================================================
// PUBLIC role onboarding doc for Chris Lannotti — the dialer/closer hire.
// URL: /team/dialer
// Walk-through of FALCO + the role + day-in-the-life + tools + numbers +
// compliance + onboarding checklist. Shareable URL.
// ============================================================================

export default function DialerRolePage() {
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
        <div className="mx-auto max-w-3xl px-5 py-3 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/70 hover:text-emerald-200 transition-colors"
          >
            ← FALCO
          </Link>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/55 hidden sm:block">
            Team · Dialer / Closer Role
          </div>
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-6 md:px-10 py-10 md:py-14 text-[14px] leading-[1.7]">
        {/* Header */}
        <header className="border-b-2 border-emerald-600 pb-6">
          <div className="text-[11px] tracking-[0.32em] uppercase font-bold text-emerald-700">
            FALCO · The Dialer / Closer Role
          </div>
          <h1 className="mt-2 text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight">
            You are the voice on the other end of the worst week of someone's life.
          </h1>
          <p className="mt-4 text-[15px] text-neutral-600 leading-[1.65]">
            This is what the job is, the tools you&apos;ll use, the numbers
            you&apos;ll move, and what FALCO is trying to be. Read it before our
            next call.
          </p>
        </header>

        {/* 1 — What FALCO is */}
        <Section n="1" title="What FALCO is">
          <p>
            Tennessee homeowners facing foreclosure get one type of call:
            wholesalers offering them 12-15% of the equity in their home, in
            cash, before the trustee sale takes everything.
          </p>
          <p>
            FALCO calls them with a different option. We route their home to a
            <strong> licensed Tennessee auction firm</strong> that runs a
            marketed sale — photos, advertising, 30-60 day campaign,
            competitive bidding — and the homeowner walks away with{" "}
            <strong>4-6× more equity</strong> than the wholesaler offer.
          </p>
          <p>
            Read the long version at{" "}
            <Link href="/manifesto" className="text-emerald-700 underline">
              falco.llc/manifesto
            </Link>{" "}
            before we talk. The math, the sources, the wholesaler industry
            we&apos;re built against — it&apos;s all there.
          </p>
        </Section>

        {/* 2 — The role */}
        <Section n="2" title="What the role actually is">
          <p>
            You are the <strong>only direct human contact</strong> between
            FALCO&apos;s data pipeline and the homeowner&apos;s decision. Without
            you, our stack is just an inbox of distressed addresses. With you,
            it becomes deals.
          </p>
          <p>The job, in one sentence:</p>
          <Note>
            Call distressed TN homeowners within hours of their property
            appearing in our pipeline, deliver a real math sheet showing
            their three options, and either route them to our auction
            partner or honestly tell them auction isn&apos;t their best path.
          </Note>
          <p className="!mt-4">It is <strong>not</strong>:</p>
          <Ul items={[
            "A cold-call sales job. You're not selling a vacuum cleaner. You're delivering math the homeowner has been trying to get for weeks.",
            "A wholesaler script. You don't pitch lowball cash offers. You don't pressure. If the auction route doesn't fit, you say so.",
            "A volume game. We'd rather you make 30 high-quality contacts a week than 300 spray-and-pray calls.",
          ]} />
        </Section>

        {/* 3 — Day in the life */}
        <Section n="3" title="A day in the life">
          <Ol items={[
            <><strong>Morning (8:30-9 AM CT):</strong> open <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-[12px]">/admin</code>. Filter to <em>New</em> + <em>Overdue</em>. Triage: which leads have a trustee sale this week? Those go to top of queue.</>,
            <><strong>Per lead (10-15 min each):</strong> open the homeowner row. Pull a quick comp on the property (Zillow, county records). Fire up <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-[12px]">/admin/math-sheet/[id]</code> and adjust the inputs to real numbers. Pre-load the email reply.</>,
            <><strong>Make the call.</strong> Goal: 60-90 seconds to introduce, 90 seconds to qualify their situation, 3-4 minutes to walk them through the 3 paths. Total call: 5-8 minutes if they&apos;re engaged, 90 seconds if they&apos;re not.</>,
            <><strong>Update /admin in real-time.</strong> Status (contacted / qualified / lost), notes from the call, next-action date if they need a callback.</>,
            <><strong>If qualified:</strong> email them the math sheet (PDF saved from <code className="px-1.5 py-0.5 bg-neutral-100 rounded text-[12px]">/admin/math-sheet</code>). Schedule a 15-min follow-up. Move status to <em>qualified</em>.</>,
            <><strong>If a yes:</strong> email handoff package to our auction partner (Parks Auction & Realty) with the property address, owner contact, mortgage balance, and the math sheet PDF. Move status to <em>listed</em>. We collect at closing.</>,
            <><strong>End of day (5 PM):</strong> 15 min reviewing tomorrow&apos;s queue. Patrick reviews your stats Friday afternoons over coffee.</>,
          ]} />
        </Section>

        {/* 4 — The tools */}
        <Section n="4" title="The tools you'll live in">
          <KvTable
            rows={[
              ["/admin", "The lead inbox. Every distressed homeowner in our pipeline. You sort, filter, status-track, and add notes here."],
              ["/admin/math-sheet/[id]", "The 3-path math generator. Pull a homeowner row, plug in actual ARV/loan/repairs, get the printable PDF. This is the deliverable."],
              ["Phone (TBD)", "We'll provide a dedicated FALCO line. Likely Google Voice or RingCentral routed to your cell. Numbers are tracked + recorded for compliance."],
              ["Email (you@falco.llc)", "Personal FALCO inbox. Replies route through this. We use Resend for outbound transactional + your inbox for human follow-up."],
              ["County records / Zillow / Redfin", "Property comp lookups. ~5 min per lead until we automate it."],
              ["Calendar (Google)", "Patrick adds you to FALCO calendar; you book follow-ups directly with homeowners from there."],
            ]}
          />
        </Section>

        {/* 5 — The numbers */}
        <Section n="5" title="The numbers you're responsible for">
          <p>
            Tennessee produces ~<strong>100 distressed property filings per
            week</strong> statewide (per Atlanta Fed mortgage delinquency
            data). Of those, FALCO&apos;s pipeline qualifies roughly{" "}
            <strong>30-50/week</strong> as actionable (right loan position,
            right county coverage, reachable owner).
          </p>
          <p>That&apos;s your daily inventory: ~6-10 fresh leads per workday.</p>
          <KvTable
            rows={[
              ["Inventory delivered to you", "~6-10 fresh leads / workday (~30-50 / week)"],
              ["Reach rate (industry standard)", "5-15% — most homeowners ignore the first call. Persistence + email follow-up matters."],
              ["Conversion to qualified", "20-40% of those reached. They engage, they hear the math, they want to see the auction option."],
              ["Conversion to listed", "30-50% of qualified. Some need time, some need to talk to family, some are too late on the timeline."],
              ["Effective close rate (filing → closed)", "~1-3%. Industry-standard for distress work. Don't take low conversion personally — it's the math."],
              ["Realistic monthly closes", "3-8 in your first 3 months, ramping to 10-20 once you have rhythm."],
              ["Per-deal FALCO revenue", "~$13K average (3% of an 8% buyer's premium on a ~$540K bid)"],
              ["Your comp", "TBD — Patrick will walk you through base + commission structure on our next call."],
            ]}
          />
        </Section>

        {/* 6 — What success looks like */}
        <Section n="6" title="What success looks like">
          <KvTable
            rows={[
              ["Month 1", "30-40 quality contacts. 3-5 qualified handoffs to Parks. 0-1 closed deals (timeline lag is real). Tight notes in /admin on every lead."],
              ["Month 3", "10-15 closed deals total. Reach rate >10%. Patrick & Parks both have a clear read on what's working / what isn't. You've identified 1-2 process gaps and we've built fixes."],
              ["Month 6", "30-50 closed deals total. You've got a personal list of 5-10 referral attorneys / counselors who send you warm leads. We're scaling to AL or KY and you're helping define the playbook."],
              ["Year 1", "$1M+ TN homeowner equity preserved through your calls. You know the TN distress market better than any wholesaler. We're hiring your replacement (you become a manager) or your peer (we double the desk)."],
            ]}
          />
        </Section>

        {/* 7 — What we're NOT */}
        <Section n="7" title="What we're not">
          <Ul items={[
            <><strong>Not wholesalers.</strong> We don't buy the house. We don't take a commission from the homeowner. We get paid only when our partner closes the marketed sale.</>,
            <><strong>Not a course / mastermind / coaching biz.</strong> We don't sell anything to investors or "students." We never will.</>,
            <><strong>Not aggressive.</strong> If a homeowner says no or doesn't engage after 3 attempts, we move on. We don't badger.</>,
            <><strong>Not a sweatshop dialer farm.</strong> Quality of conversation beats quantity. You&apos;ll have time to think between calls. You&apos;ll be expected to use it.</>,
            <><strong>Not a get-rich-quick play.</strong> Six figures of homeowner equity per closed deal compounds. So does our reputation. Both take 12-24 months to ramp. We're playing for years, not months.</>,
          ]} />
        </Section>

        {/* 8 — Compliance */}
        <Section n="8" title="Compliance — the non-negotiables">
          <p>
            This work touches federal consumer protection law. Mistakes here
            kill the company. Read this carefully.
          </p>
          <Ul items={[
            <><strong>TCPA (calls):</strong> No calls outside 8 AM – 9 PM in the homeowner&apos;s local time zone (TN is mostly Central, parts of east TN are Eastern). No autodialer to cell phones. No prerecorded messages without consent.</>,
            <><strong>DNC (Do Not Call):</strong> Every number gets scrubbed against the National DNC Registry before dialing. We&apos;ll set up the scrubbing tool — you confirm the badge before each call.</>,
            <><strong>SMS:</strong> Never send a text to a number that hasn&apos;t given prior express consent. CTIA + carrier rules + federal law all stack here. When in doubt, call instead.</>,
            <><strong>Recording:</strong> TN is a one-party consent state — you can record without telling them. We do record for training + compliance. Disclose it anyway: "I record my calls for quality, that OK?" Most say yes.</>,
            <><strong>Disclosure:</strong> First sentence after their hello: "Hi, this is [your name] with FALCO — we&apos;re a Tennessee company that helps homeowners facing foreclosure understand their options. Your address came up in the [county] trustee filings. Got 90 seconds?"</>,
            <><strong>Honesty:</strong> Never imply you&apos;re from the lender, the court, the trustee, or a government agency. Never say "we can save your home" — sometimes we can&apos;t. Always say what we actually are: a routing service to a marketed auction.</>,
            <><strong>Document everything:</strong> Every call gets a note in /admin. Every email goes through your falco.llc inbox. If we ever get a complaint, we need to be able to show what happened.</>,
          ]} />
          <Note>
            We&apos;ll do a 1-hour compliance walkthrough on day 1 with Patrick.
            You won&apos;t be expected to know all this on day zero.
          </Note>
        </Section>

        {/* 9 — Onboarding checklist */}
        <Section n="9" title="Onboarding checklist (first week)">
          <Ol items={[
            "Read this doc end-to-end. Read the manifesto.",
            "Day 1: 1-hour intro call with Patrick. Walk through /admin live. Walk through /admin/math-sheet live. Compliance overview.",
            "Day 1: get @falco.llc email set up. Get FALCO phone line provisioned.",
            "Day 2: shadow Patrick on 3-5 calls. Take notes. Ask everything.",
            "Day 3-4: make 5-10 calls under Patrick's coaching. Debrief each one within an hour.",
            "Day 5: solo on the queue. Patrick reviews your /admin notes at end of day.",
            "Week 2: Friday afternoon — your first weekly review with Patrick. Numbers + qualitative read.",
          ]} />
        </Section>

        {/* 10 — Why Chris specifically */}
        <Section n="10" title="Why we want you on this">
          <p>
            Patrick will fill in the personal version of this in conversation.
            But the structural reason FALCO needs the right person in this seat:
          </p>
          <p>
            The homeowner on the other end is having one of the worst weeks of
            their life. They&apos;ve been lied to by wholesalers, ignored by
            their lender, and possibly disappointed by family. The first 60
            seconds of your call decides whether they hear the rest of it.
          </p>
          <p>
            The job needs someone who can hold both: the operational rigor to
            move ~30 leads through a pipeline weekly, and the human steadiness
            to be the reason a Tennessee family keeps $100K of equity. Most
            people are good at one. Patrick thinks you&apos;re good at both.
            That&apos;s why this conversation is happening.
          </p>
        </Section>

        {/* 11 — Open questions */}
        <Section n="11" title="What we should talk about">
          <p>Bring questions on:</p>
          <Ul items={[
            "Comp structure (base + commission, or commission-only, or hybrid). Patrick has a model in mind — wants your read on it before locking.",
            "Schedule. Full-time? Part-time ramping to full? You decide what works.",
            "Geography. Are you working from TN or remote? FALCO doesn't need you in an office; calls are the work.",
            "Tools you've used before — CRM, dialer, anything. We'll match the stack to what you're fastest with.",
            "Any compliance / RE licensing background. Not required (you're not the licensed agent — Parks is) but a plus if you have any.",
            "What scares you about the role. The honest answer is more useful than the polished one.",
          ]} />
        </Section>

        {/* Contact */}
        <section className="mt-10 rounded-lg border-2 border-emerald-600 bg-emerald-50 p-5">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-800 font-semibold">
            Next step
          </div>
          <h3 className="mt-2 text-[18px] font-semibold tracking-tight text-neutral-900">
            Walk this back through with Patrick on the next call.
          </h3>
          <p className="mt-2 text-[13px] text-neutral-700 leading-[1.6]">
            Email questions or notes to{" "}
            <a href="mailto:falco@falco.llc" className="text-emerald-700 underline">
              falco@falco.llc
            </a>{" "}
            ahead of time. Or just bring them to the call. Either works.
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-10 pt-5 border-t border-neutral-300 text-[11px] text-neutral-500">
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
// Primitives — same look as the Parks term sheet
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

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 rounded border-l-2 border-emerald-500 bg-emerald-50 px-3 py-2 text-[13px] leading-[1.6] text-emerald-900">
      {children}
    </div>
  )
}
