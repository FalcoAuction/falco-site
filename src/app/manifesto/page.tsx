import Link from "next/link"

export const metadata = {
  title: "Why FALCO exists — Manifesto",
  description:
    "Why we built FALCO instead of becoming another wholesaler. The math, the harm, the alternative.",
}

export default function ManifestoPage() {
  return (
    <main className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      {/* Background */}
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.4]" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="text-[13px] font-semibold tracking-[0.28em] text-white hover:text-emerald-300 transition-colors"
          >
            FALCO
          </Link>
          <Link
            href="/"
            className="text-[12px] tracking-wide text-white/55 hover:text-white transition-colors"
          >
            ← Back
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-10 md:px-10 md:pt-32">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/85 font-semibold">
          Manifesto
        </div>
        <h1 className="mt-5 text-[42px] md:text-[68px] leading-[1.0] tracking-[-0.03em] font-semibold">
          Tennessee homeowners lose{" "}
          <span className="text-emerald-400">six figures of equity</span>{" "}
          a week to people who do nothing for it.
        </h1>
        <p className="mt-7 text-[16px] md:text-[20px] leading-[1.65] text-white/65">
          That's why FALCO exists. This page explains the harm,
          the math, and what we built instead.
        </p>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10 md:pb-32 space-y-14 md:space-y-20">
        <Block n="01" title="The setup nobody talks about">
          <p>
            A Tennessee homeowner falls behind on their mortgage. Maybe a
            divorce, maybe a job loss, maybe a medical bill cascade. Within
            120 days the lender files a notice of substitution of trustee.
            That filing is public record. By the next morning, the homeowner's
            mailbox is full of letters. By the next afternoon, their phone is
            ringing.
          </p>
          <p>
            Every caller has the same offer. <em>"We buy houses cash, as-is,
            close in seven days."</em> Some of them have funny dot-com
            domains. Some of them have polished branding. None of them are
            telling the homeowner what their house is actually worth.
          </p>
          <p>
            Because the actual number — what a buyer would pay in an open,
            competitive sale — is not what the wholesaler is offering. The
            wholesaler is offering a discount. The discount IS the business
            model.
          </p>
        </Block>

        <Block n="02" title="The math the homeowner never sees">
          <p>
            Take a Davidson County home worth $500,000 with a $300,000 loan
            balance. The trustee sale is six weeks out. Here's what each
            path actually puts in the homeowner's pocket:
          </p>
          <table className="w-full text-[14px] md:text-[15px] my-2">
            <tbody>
              <tr className="border-b border-white/[0.06]">
                <td className="py-3 pr-4 text-white/70">Trustee sale closes</td>
                <td className="py-3 text-right text-white/55 tabular-nums">$0</td>
              </tr>
              <tr className="border-b border-white/[0.06]">
                <td className="py-3 pr-4 text-white/70">Wholesaler offer (typical)</td>
                <td className="py-3 text-right text-white/55 tabular-nums">~$25,000</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-emerald-300">Marketed auction (85–95% of retail)</td>
                <td className="py-3 text-right text-emerald-300 tabular-nums font-semibold">~$130,000</td>
              </tr>
            </tbody>
          </table>
          <p>
            The wholesaler keeps the $105,000 spread. The homeowner spends
            five years recovering. Sometimes ten.
          </p>
          <p>
            Multiply that by the dozens of distressed properties moving
            through Tennessee's larger counties every week, and the scale of
            the equity transfer is staggering. Not to investors who renovate
            and add value. To people whose only contribution to the
            transaction was finding a desperate seller and acting fast
            enough to close before anyone else showed up.
          </p>
        </Block>

        <Block n="03" title="Why this works at all">
          <p>
            The wholesaler model depends on three things: information
            asymmetry, time pressure, and a missing alternative.
          </p>
          <ul className="space-y-3 list-disc pl-5 marker:text-emerald-400/60">
            <li>
              <strong className="text-white">Information asymmetry.</strong>{" "}
              The homeowner doesn't know what their house would clear at a
              real auction. The wholesaler does, because that's their job.
            </li>
            <li>
              <strong className="text-white">Time pressure.</strong> The
              trustee sale date is real. Once it passes, the equity is gone.
              That deadline makes a fast cash offer feel like the only
              option even when better ones exist.
            </li>
            <li>
              <strong className="text-white">No alternative.</strong> By the
              time most homeowners realize what's happening, the only people
              who've reached them are wholesalers. Realtors don't proactively
              chase distress. Auction firms don't market to homeowners.
              Lenders certainly don't.
            </li>
          </ul>
          <p>
            FALCO breaks all three. We monitor the public records every day,
            so we know what's happening before the wholesaler call. We show
            the homeowner the math — what their house is actually worth and
            what they'd net after the loan is paid. And we route the home to
            a state-licensed Tennessee auction firm that runs a real
            marketed sale: photos, advertising, a defined sale day,
            competitive bidding.
          </p>
        </Block>

        <Block n="04" title="Why we don't buy the house ourselves">
          <p>
            Becoming another buyer would make us part of the problem. Every
            dollar we'd profit on the spread is a dollar that should have
            gone to the homeowner. We don't want that business.
          </p>
          <p>
            FALCO is paid the same way auction houses have been paid for
            two hundred years: a buyer's premium added to the winning bid.
            The homeowner pays nothing. We have no incentive to push the
            sale price down. We have every incentive to push it up.
          </p>
        </Block>

        <Block n="05" title="What we're not">
          <p>
            We're not going to call you the day after the notice files
            offering you cash. We're not going to send you a letter with a
            handwritten font and a 90s clip-art logo telling you we're a
            local family. We're not the courthouse foreclosure auction —
            that's the thing we're trying to prevent.
          </p>
          <p>
            We're a Tennessee company that thinks an honest auction is
            better than a predatory cash offer, and we've built the
            machinery to actually deliver one.
          </p>
        </Block>

        <Block n="06" title="If you're a homeowner reading this">
          <p>
            Get the math before you sign anything. Even if it's not us — get
            it from someone. The 30 minutes it takes to check what your
            house would actually clear at a real sale is the highest-paying
            half-hour you'll ever work.
          </p>
          <p>
            We'll do that math for free. No pitch, no pressure, no obligation
            to list with us. If the auction route doesn't fit your situation,
            we'll tell you that plainly and you go on with your life knowing
            what your options actually were.
          </p>
        </Block>

        {/* CTA */}
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] p-8 md:p-10">
          <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300 mb-3 font-semibold">
            Talk to us
          </div>
          <h3 className="text-[24px] md:text-[30px] leading-tight tracking-tight font-semibold">
            Free 15-minute call. Real numbers for your specific situation.
          </h3>
          <p className="mt-3 text-[14px] md:text-[15px] text-white/65 leading-[1.65]">
            Within one business day we'll come back to you with what your
            home would clear at a marketed auction vs. what you'd lose at
            the trustee sale.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <Link
              href="/homeowners"
              className="inline-flex items-center justify-center rounded-md bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-[14px] tracking-wide px-6 py-3 transition-colors"
            >
              Start with the form →
            </Link>
            <span className="text-[12px] text-white/45">
              Or email{" "}
              <a
                href="mailto:falco@falco.llc"
                className="text-emerald-300 hover:text-emerald-200"
              >
                falco@falco.llc
              </a>
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-3xl px-6 py-10 md:px-10 border-t border-white/[0.06]">
        <div className="flex items-center justify-between flex-wrap gap-4 text-[11px] tracking-[0.18em] text-white/35">
          <div>FALCO · Tennessee</div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-white/70 transition-colors">
              Home
            </Link>
            <Link href="/homeowners" className="hover:text-white/70 transition-colors">
              Homeowners
            </Link>
            <Link href="/inquiry" className="hover:text-white/70 transition-colors">
              Contact
            </Link>
            <Link href="/privacy" className="hover:text-white/70 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function Block({
  n,
  title,
  children,
}: {
  n: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="grid md:grid-cols-[80px_1fr] gap-3 md:gap-10">
      <div className="text-emerald-400/85 text-[13px] font-semibold tracking-[0.18em] tabular-nums">
        {n}
      </div>
      <div>
        <h2 className="text-[24px] md:text-[34px] tracking-tight font-semibold text-white">
          {title}
        </h2>
        <div className="mt-5 space-y-5 text-[15px] md:text-[17px] leading-[1.75] text-white/72">
          {children}
        </div>
      </div>
    </div>
  )
}
