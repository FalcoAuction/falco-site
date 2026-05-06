import Link from "next/link"
import PrintButton from "../../pilot/parks/economics/print-button"

export const dynamic = "force-static"
export const metadata = {
  title: "FALCO — For the Caller",
  description:
    "Why FALCO needs the right caller, what we're building together, and the questions a serious operator should be asking before they sign on.",
  robots: "noindex, nofollow",
}

// ============================================================================
// PUBLIC mission/alignment doc for whoever's stepping into the caller seat.
// URL: /team/dialer
// Peer-to-peer pitch — the doc assumes the reader already knows operational
// mechanics (cold-calling, distress conversations). This is about mission,
// personal fit, commitment, and what we're playing for.
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
            For the Caller
          </div>
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-6 md:px-10 py-10 md:py-14 text-[15px] leading-[1.75]">
        {/* Header */}
        <header className="border-b-2 border-emerald-600 pb-6">
          <div className="text-[11px] tracking-[0.32em] uppercase font-bold text-emerald-700">
            FALCO · For the Caller
          </div>
          <h1 className="mt-3 text-[30px] md:text-[42px] font-semibold tracking-tight leading-[1.05]">
            We don&apos;t need you to learn the job. We need you to mean it.
          </h1>
          <p className="mt-5 text-[16px] text-neutral-600 leading-[1.65]">
            You already know how to dial. You know what wholesalers sound like
            on the phone because you&apos;ve been one. You know the script, the
            leverage points, the tone-shift when the homeowner starts to push
            back. None of that needs explaining. This is about everything else.
          </p>
        </header>

        {/* 1 — The mission */}
        <Section n="1" title="The mission, in plain English">
          <p>
            Tennessee families lose roughly <strong>$78 million of equity per
            year</strong> to wholesalers. Not to investors who renovate and add
            value. To people whose only contribution to the transaction was
            finding a desperate seller and acting fast.
          </p>
          <p>
            FALCO exists to put that money back where it belongs. We monitor
            the same county filings the wholesalers monitor. We get to the
            homeowner first. We show them what their house actually clears at
            a marketed auction. We route the deal to a licensed Tennessee
            auction firm — Parks Auction &amp; Realty in Murfreesboro — and
            the family walks away with 4-6× more than the wholesaler would
            have given them.
          </p>
          <p>
            That&apos;s the whole company. No app. No course. No webinar. Just
            the homeowner on the phone, the math sheet on the table, and the
            choice in front of them.
          </p>
          <Note>
            Read the long version, with sources, at{" "}
            <Link href="/manifesto" className="text-emerald-700 underline">
              falco.llc/manifesto
            </Link>
            . If the math there doesn&apos;t make you want to go to work
            tomorrow, the rest of this doc is moot.
          </Note>
        </Section>

        {/* 2 — Why YOU specifically */}
        <Section n="2" title="Why we need somebody who used to wholesale">
          <p>
            Most people in your seat at FALCO would be a former real estate
            agent, a former call-center closer, or a kid out of college trying
            to learn the trade. Any of them would be fine at the mechanics.
            None of them can do what you can do.
          </p>
          <p>
            <strong>You&apos;ve been the call the homeowner is afraid to
            answer.</strong> You know exactly what the next wholesaler is
            going to say to them — because you&apos;ve said it. You know the
            urgency play. The repair-cost inflation. The "we&apos;re a local
            family" angle. The "I just need to know your bottom number"
            close. All of it.
          </p>
          <p>That&apos;s our weapon.</p>
          <p>
            When you call a Tennessee homeowner two days after their notice
            files, you can do something nobody else at FALCO can:
          </p>
          <Note muted>
            "Look — you&apos;re going to get a call in the next 48 hours from
            somebody offering you cash, fast, no questions. Probably named
            Brad. Probably says he&apos;s a local family. He&apos;s going to
            tell you the house needs $25K in repairs whether it does or not.
            He&apos;s going to push you to commit on the call. Here&apos;s
            what he won&apos;t tell you. Here&apos;s the math he&apos;s
            doing in his head while he&apos;s talking to you. And here&apos;s
            what your house is actually worth if we run a real sale."
          </Note>
          <p>
            That conversation is impossible from anyone who hasn&apos;t lived
            it. The homeowner hears it and thinks "this person is on my
            side." That&apos;s not a tactic. That&apos;s the truth — you ARE
            on their side now, and you&apos;re the only person at FALCO who
            can prove it from experience.
          </p>
          <p>
            <strong>You&apos;re the antibody.</strong> Every wholesaler call
            we preempt is a Tennessee family that keeps their house money.
            That&apos;s the seat. That&apos;s why this is your call to take
            or pass on.
          </p>
        </Section>

        {/* 3 — Personal alignment */}
        <Section n="3" title="Questions only you can answer">
          <p>
            None of these have right answers. We&apos;re not testing you.
            But before we go further, sit with them.
          </p>
          <Ul items={[
            "Why did you stop wholesaling? (Or why do you want to?) Answer honestly to yourself, not to Patrick.",
            "What's the worst homeowner conversation you ever had as a wholesaler — the one that, looking back, you'd handle completely differently? What did you learn from it that you've never used since?",
            "Who in your life would be most disappointed if you took this work seriously vs. did it half-assed? Are you OK with the version of yourself they'd see in 6 months?",
            "What does success at FALCO look like for you 18 months from now, in a way that has nothing to do with money?",
            "What's the version of this job that would make you walk away? Not 'what's a dealbreaker' — what's the SLOW death? The thing that would burn you out by month 4 if we let it?",
          ]} />
          <p>
            We don&apos;t need answers to all of these on the next call. We
            need to know you&apos;ve at least asked yourself the questions.
          </p>
        </Section>

        {/* 4 — Commitment */}
        <Section n="4" title="The honest mutual ask">
          <p>What we&apos;re asking from you:</p>
          <Ul items={[
            <>To be the <strong>best in Tennessee</strong> at this conversation. Not the busiest. Not the highest-volume. The best.</>,
            <>To pick up the 7 AM call when a homeowner&apos;s trustee sale is tomorrow.</>,
            <>To be willing to ship deals that piss off people you used to work with on the wholesaler side. Some of them won&apos;t talk to you again. Some will. The ones that do are worth keeping.</>,
            <>To tell us when something isn&apos;t working — the script, the handoff, the partner, the comp, anything. We don&apos;t need yes-men. We need the operator who saw the problem first.</>,
            <>To stay 24-36 months. This kind of work compounds. Reputation, referral network, your own muscle memory on the conversation — none of it shows up in month 3. All of it shows up in year 2.</>,
          ]} />
          <p className="mt-5">What you should be asking from us:</p>
          <Ul items={[
            <>Comp that respects what you bring. Patrick has a model. Push back on it if it doesn&apos;t reflect your value — your wholesaler experience is the lever, use it.</>,
            <>Honest scoreboards. Weekly numbers, monthly review, no BS. If we&apos;re winning we both see it; if we&apos;re losing we both see it.</>,
            <>Tools that don&apos;t suck. The /admin lead inbox is real. The math sheet generator is real. We&apos;ll fix anything operational that&apos;s slowing you down within a week.</>,
            <>A real partner on the auction side, not a flake. Parks is 40 years old, doing the meeting tomorrow. If for any reason that doesn&apos;t pan out we&apos;ll have a different licensed firm in place before you take your first call.</>,
            <>Equity. Not just commission. If you&apos;re building this with us, you should own a piece of what we build. We&apos;ll talk about what that looks like.</>,
            <>Honesty about what could go sideways. We&apos;re early. Things will break. We&apos;d rather you walk in eyes open than oversold.</>,
          ]} />
        </Section>

        {/* 5 — What we're playing for */}
        <Section n="5" title="What we're actually playing for">
          <p>
            We have the data pipeline. We have the auction partner. We have
            the math. We have the homeowner-facing brand. What&apos;s missing
            is the voice on the phone.
          </p>
          <p>That&apos;s the seat we&apos;re offering you.</p>
          <p>12 months from now, here&apos;s the realistic floor:</p>
          <KvTable
            rows={[
              ["TN deals closed", "30-50"],
              ["TN homeowner equity preserved", "$3-5M (real money, real families, real receipts)"],
              ["FALCO ARR", "$400K-$700K"],
              ["Your role", "OG of the dialer function. Either training the next two hires or running them."],
              ["Geographic reach", "Probably TN + AL by month 12. KY in year 2."],
            ]}
          />
          <p>And the realistic ceiling:</p>
          <KvTable
            rows={[
              ["Year 2-3 deals/year", "150-300 across TN/AL/KY"],
              ["Year 2-3 ARR", "$2-5M"],
              ["Equity outcome for you", "Material, if you bought in early"],
              ["What you actually built", "The honest alternative to wholesaling in the South. A category. Not a company — a category."],
            ]}
          />
          <p>
            FALCO doesn&apos;t need to be a unicorn to be worth your 24-36
            months. It needs to do exactly what it says it does, on enough
            properties, for long enough that wholesalers start losing
            inventory to us instead of the other way around. That&apos;s the
            game.
          </p>
        </Section>

        {/* 6 — The honest part */}
        <Section n="6" title="What you should know about us">
          <p>
            Patrick is 23. He built the data pipeline, the site, the math
            sheet, the lead inbox, the partner pitch — all of it — solo. He
            knows what he doesn&apos;t know, and one of those things is your
            half of the work. He&apos;s not going to tell you how to handle a
            homeowner on the phone. He&apos;d be embarrassed to try.
          </p>
          <p>
            What he is going to do: keep the pipeline full, ship the tools
            you need, close the partner deals, raise capital when the time
            comes, and stay out of your way on the homeowner conversations
            you&apos;re running.
          </p>
          <p>
            FALCO is bootstrapped. Patrick&apos;s uncle (built Bargain Hunt,
            astock.com — real operator, not just check-writer) is coming in
            as advisor + small early investor after the Parks pilot proves
            the unit economics. There&apos;s a path to a real seed round in
            12-18 months on actual numbers. Not a deck.
          </p>
          <p>
            We&apos;re not going to oversell. The first 3-5 closed deals are
            going to be slower and uglier than anyone wants. Some of those
            calls are going to be heavy — homeowners crying, families
            fighting, lenders being lenders. You&apos;ve been close enough to
            this work to know that. We just want you in with eyes open.
          </p>
        </Section>

        {/* 7 — The ask */}
        <Section n="7" title="The actual ask">
          <p>
            Read this. Sit with it for a day. Then tell us:
          </p>
          <Ol items={[
            "Are you in or are you out? Don't soft-pedal a 'maybe.' We'd rather hear no this week than maybe for a month.",
            "If you're in — what do you need from us to be all-in? Comp, structure, equity, schedule, anything. Be direct.",
            "If you're out — tell us what we'd need to change for it to be a yes. Maybe we can. Maybe we can't. Either way it's useful.",
          ]} />
        </Section>

        {/* Hype close */}
        <section className="mt-10 rounded-xl border-2 border-emerald-600 bg-emerald-50 p-6 md:p-7">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-800 font-semibold">
            Last thing
          </div>
          <h3 className="mt-2 text-[22px] md:text-[26px] font-semibold tracking-tight text-neutral-900 leading-tight">
            Nobody else gets to do this work.
          </h3>
          <p className="mt-3 text-[14px] md:text-[15px] text-neutral-800 leading-[1.7]">
            Nobody at the wholesaler firms gets to be the antibody. Nobody at
            the auction firms gets to talk to the homeowner before the system
            chews them up. Nobody at the foreclosure-help nonprofits has the
            data pipeline or the math or the partner machinery. The job is
            sitting open in TN right now, and the person who fills it gets to
            decide what the next decade of distress real estate looks like in
            the South.
          </p>
          <p className="mt-3 text-[14px] md:text-[15px] text-neutral-800 leading-[1.7]">
            Patrick thinks that&apos;s you. Tell us if he&apos;s right.
          </p>
          <p className="mt-4 text-[12px] text-neutral-600">
            Email{" "}
            <a href="mailto:falco@falco.llc" className="text-emerald-700 underline">
              falco@falco.llc
            </a>{" "}
            or just text. You know how to reach us.
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
// Primitives
// ============================================================================

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[20px] md:text-[22px] font-semibold tracking-tight text-neutral-900 leading-tight">
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
              <td className="px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-neutral-500 font-semibold w-[200px] align-top bg-neutral-50">
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
    <div className={`mt-2 rounded border-l-2 px-3 py-2 text-[13px] leading-[1.65] ${
      muted
        ? "border-neutral-300 bg-neutral-50 text-neutral-700 italic"
        : "border-emerald-500 bg-emerald-50 text-emerald-900"
    }`}>
      {children}
    </div>
  )
}
