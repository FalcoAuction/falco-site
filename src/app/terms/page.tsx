import Link from "next/link"

export const metadata = {
  title: "Terms · FALCO Tennessee",
  description:
    "Terms of service covering FALCO's website, communications, and outreach.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      {/* Background — same v2 stack, static */}
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.45]" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060606]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-10">
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
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-8 md:px-10 md:pt-28">
        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75">
          Terms
        </div>
        <h1 className="mt-4 text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] font-semibold">
          The rules of the road.
        </h1>
        <p className="mt-6 text-[15px] md:text-[17px] leading-[1.65] text-white/60">
          Plain-language terms covering the website, our communications, and
          the work FALCO does. Last updated May 20, 2026.
        </p>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10 md:pb-32">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-10 backdrop-blur-sm space-y-8 text-[14px] md:text-[15px] leading-[1.7] text-white/70">
          <Block title="Who we are">
            <p>
              FALCO is a Tennessee distressed-real-estate intelligence and
              auction-routing operation run by Patrick Yuri Armour, a
              Tennessee-licensed auctioneer. Contact:{" "}
              <span className="text-emerald-200">falco@falco.llc</span>,{" "}
              601-213-8868, falco.llc. By using this site or communicating
              with us, you agree to these terms.
            </p>
          </Block>

          <Block title="What FALCO does">
            <p>
              FALCO identifies properties in pre-foreclosure, lis pendens,
              trustee sale, bankruptcy, or other distressed status from
              Tennessee public records. We reach out to owners to introduce a
              no-cost auction-routing alternative to standard trustee sale
              proceedings. We are not your lawyer, your tax advisor, or your
              loan servicer. Nothing on this site or in our messages is legal,
              tax, or investment advice.
            </p>
          </Block>

          <Block title="Eligibility">
            <p>
              You must be at least 18 years old and able to enter into a
              binding agreement to use this site or engage our services.
            </p>
          </Block>

          <Block title="SMS / text messaging program">
            <p>
              <strong className="text-white/85">Program name:</strong> FALCO
              outreach.
            </p>
            <p>
              <strong className="text-white/85">Description:</strong> FALCO
              sends text messages only to people who have opted in. Consent
              is given verbally during a phone conversation with Patrick
              Armour (Tennessee licensed auctioneer), or by submitting the
              consent form on this site. The date and manner of consent are
              recorded. Messages are case-specific follow-up: scheduling,
              documents you requested, and answers to questions from your
              conversation with us. We do not send promotional blasts.
            </p>
            <p>
              <strong className="text-white/85">Message frequency:</strong>{" "}
              recurring messages may be sent. Frequency varies based on the
              conversation; most active cases involve 1–10 messages.
            </p>
            <p>
              <strong className="text-white/85">Message and data rates:</strong>{" "}
              may apply. Check with your wireless carrier; FALCO does not
              control your carrier's pricing.
            </p>
            <p>
              <strong className="text-white/85">Opt out:</strong> Reply{" "}
              <span className="text-emerald-200">STOP</span> at any time. We
              also honor{" "}
              <span className="text-emerald-200">UNSUBSCRIBE</span>,{" "}
              <span className="text-emerald-200">CANCEL</span>,{" "}
              <span className="text-emerald-200">END</span>, and{" "}
              <span className="text-emerald-200">QUIT</span>. You will receive
              a confirmation, then no further messages.
            </p>
            <p>
              <strong className="text-white/85">Help:</strong> Reply{" "}
              <span className="text-emerald-200">HELP</span> for sender
              identification and contact information, or email{" "}
              <span className="text-emerald-200">falco@falco.llc</span>.
            </p>
            <p>
              <strong className="text-white/85">Supported carriers:</strong>{" "}
              AT&T, T-Mobile, Verizon, US Cellular, and other US wireless
              carriers. Carriers are not liable for delayed or undelivered
              messages.
            </p>
            <p>
              <strong className="text-white/85">Privacy:</strong> SMS
              opt-in data and consent are not shared with third parties. See
              the{" "}
              <Link
                href="/privacy"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                Privacy Policy
              </Link>{" "}
              for full details.
            </p>
          </Block>

          <Block title="No legal, tax, or financial advice">
            <p>
              Foreclosure, bankruptcy, and distressed-property situations have
              real legal and tax consequences. FALCO provides operational
              information about auction routing as a TN-licensed auctioneer;
              we do not provide legal or tax advice. Consult a Tennessee
              attorney, a CPA, a HUD-approved housing counselor, or a
              bankruptcy trustee for advice specific to your situation.
            </p>
          </Block>

          <Block title="Estimates and math sheets">
            <p>
              Property values, mortgage balances, equity calculations, and
              proceeds estimates on this site, in our messages, or in any
              "math sheet" we produce, are good-faith estimates based on
              public records and third-party data sources. They are not
              guarantees. Actual auction outcomes depend on buyer turnout,
              market conditions, property condition, title issues, and
              factors outside FALCO's control.
            </p>
          </Block>

          <Block title="Website use">
            <p>
              You agree not to attempt to gain unauthorized access to this
              site or its systems, not to scrape it at a rate that interferes
              with availability for others, and not to use it to violate any
              law. We may suspend access for abuse without notice.
            </p>
          </Block>

          <Block title="Intellectual property">
            <p>
              The FALCO name, marks, copy, layout, and content on this site
              are owned by FALCO. You may share or quote excerpts with
              attribution. You may not republish substantial portions or
              build a competing product on top of FALCO's content without
              written permission.
            </p>
          </Block>

          <Block title="Disclaimer of warranties">
            <p>
              The site and our communications are provided "as is." We do not
              warrant that the information is complete, current, or
              error-free. To the maximum extent allowed by Tennessee law,
              FALCO disclaims all warranties, express or implied, including
              fitness for a particular purpose.
            </p>
          </Block>

          <Block title="Limitation of liability">
            <p>
              FALCO is not liable for indirect, incidental, special, or
              consequential damages arising from your use of the site or our
              communications. Our total liability for any claim related to
              the site is limited to the greater of $100 or the amount you
              paid FALCO in the prior 12 months (typically $0, since
              homeowner outreach is no-cost).
            </p>
          </Block>

          <Block title="Indemnification">
            <p>
              You agree to indemnify FALCO against claims arising from your
              misuse of the site or breach of these terms.
            </p>
          </Block>

          <Block title="Governing law">
            <p>
              These terms are governed by the laws of the State of Tennessee
              without regard to conflict-of-laws principles. Any dispute will
              be resolved in the state or federal courts located in Davidson
              County, Tennessee.
            </p>
          </Block>

          <Block title="Changes">
            <p>
              We may update these terms. Material changes will be reflected
              by an updated "Last updated" date above. Continued use after
              changes constitutes acceptance.
            </p>
          </Block>

          <Block title="Contact">
            <p>
              Questions about these terms:{" "}
              <span className="text-emerald-200">falco@falco.llc</span>, or
              use the{" "}
              <Link
                href="/inquiry"
                className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
              >
                general inquiry form
              </Link>
              .
            </p>
          </Block>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-5xl px-6 py-10 md:px-10 border-t border-white/[0.06]">
        <div className="flex items-center justify-between flex-wrap gap-4 text-[11px] tracking-[0.18em] text-white/35">
          <div>FALCO · Tennessee</div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-white/70 transition-colors">
              Home
            </Link>
            <Link href="/privacy" className="hover:text-white/70 transition-colors">
              Privacy
            </Link>
            <Link href="/inquiry" className="hover:text-white/70 transition-colors">
              Contact
            </Link>
            <span className="text-white/15">falco.llc</span>
          </div>
        </div>
      </footer>
    </main>
  )
}

function Block({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75 mb-3">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
