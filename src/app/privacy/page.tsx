import Link from "next/link"

export const metadata = {
  title: "Privacy · FALCO Tennessee",
  description:
    "How FALCO handles the information you share through our forms, calls, and emails.",
}

export default function PrivacyPage() {
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
          Privacy
        </div>
        <h1 className="mt-4 text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] font-semibold">
          How we handle what you tell us.
        </h1>
        <p className="mt-6 text-[15px] md:text-[17px] leading-[1.65] text-white/60">
          Short version: we use the information you share to respond to you, and
          we don't sell it. Last updated May 20, 2026.
        </p>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-3xl px-6 pb-24 md:px-10 md:pb-32">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-10 backdrop-blur-sm space-y-8 text-[14px] md:text-[15px] leading-[1.7] text-white/70">
          <Block title="What we collect">
            <p>
              When you submit a form on this site (homeowner request, buyer
              registration, partner inquiry, or general inquiry), we collect
              what you type into that form. Typically that's your name, email,
              phone, and a few details about your situation or company.
            </p>
            <p>
              When you email us at{" "}
              <span className="text-emerald-200">falco@falco.llc</span>, we
              receive whatever you send.
            </p>
            <p>
              We don't run third-party analytics that track you across the web.
              Our hosting provider keeps standard server logs (IP address,
              request time, page) for operational and security purposes.
            </p>
          </Block>

          <Block title="What we do with it">
            <p>
              We use what you share to respond to you, prepare the analysis you
              asked for, and follow up about your situation. For homeowners,
              that means looking up public county records on the property you
              identified so we can come back with real numbers.
            </p>
            <p>
              We may share information with the licensed Tennessee auction firm
              we'd partner with on your specific listing. That sharing is
              limited to what's needed to do the work.
            </p>
          </Block>

          <Block title="What we don't do">
            <p>
              We don't sell, rent, or trade your personal information to data
              brokers, lead aggregators, or marketers.
            </p>
            <p>
              We don't add you to a marketing list because you sent us a form.
              If we ever start a newsletter, it'll be opt-in only.
            </p>
          </Block>

          <Block title="SMS / Text messaging">
            <p>
              FALCO sends text messages only with your consent. You opt in
              during a phone conversation with Patrick Armour (Tennessee
              licensed auctioneer) by verbally agreeing to receive text
              follow-up about your property, or by submitting the consent
              form on this site. We record the date and manner of your
              consent. We do not send marketing blasts, and we do not text
              anyone who has not opted in.
            </p>
            <p>
              Messages relate to your specific case: follow-up on the
              conversation you had with us, scheduling, documents you
              requested, and answers to your questions.
            </p>
            <p>
              <strong className="text-white/85">What we collect:</strong> the
              phone number you provided, the content of your messages,
              timestamps, your consent record, and (when known) the property
              the conversation relates to.
            </p>
            <p>
              <strong className="text-white/85">Frequency:</strong> message
              frequency varies based on the conversation. Most active cases
              involve 1–10 messages.
            </p>
            <p>
              <strong className="text-white/85">No marketing or third-party
              sharing:</strong> No mobile information will be shared with third
              parties or affiliates for marketing or promotional purposes. All
              of the categories above exclude text-messaging originator opt-in
              data and consent; this information will not be shared with any
              third parties.
            </p>
            <p>
              <strong className="text-white/85">Carrier costs:</strong> Message
              and data rates may apply. FALCO does not control your carrier's
              pricing.
            </p>
            <p>
              <strong className="text-white/85">Opt out:</strong> Reply{" "}
              <span className="text-emerald-200">STOP</span> at any time to
              stop receiving messages. We also honor{" "}
              <span className="text-emerald-200">UNSUBSCRIBE</span>,{" "}
              <span className="text-emerald-200">CANCEL</span>,{" "}
              <span className="text-emerald-200">END</span>, and{" "}
              <span className="text-emerald-200">QUIT</span>. You can also
              email{" "}
              <span className="text-emerald-200">falco@falco.llc</span> with
              the subject line "Stop SMS." Opt-out records are kept
              indefinitely so we do not contact you again.
            </p>
            <p>
              <strong className="text-white/85">Help:</strong> Reply{" "}
              <span className="text-emerald-200">HELP</span> for sender
              identification and contact information.
            </p>
          </Block>

          <Block title="How long we keep it">
            <p>
              Form submissions and email correspondence are retained for our
              records and to maintain continuity if you reach out again. You
              can ask us to delete your information at any time by emailing{" "}
              <span className="text-emerald-200">falco@falco.llc</span> with
              the subject line "Delete my information."
            </p>
          </Block>

          <Block title="Security">
            <p>
              Form data is transmitted over HTTPS and stored in a managed
              Postgres database with restricted access. No system is perfectly
              secure, but we treat what you share with reasonable care.
            </p>
          </Block>

          <Block title="Children">
            <p>
              This site is not directed at children under 13, and we don't
              knowingly collect information from them.
            </p>
          </Block>

          <Block title="Changes">
            <p>
              If we make material changes to how we handle your information,
              we'll update this page and revise the "Last updated" date above.
            </p>
          </Block>

          <Block title="Contact">
            <p>
              Questions about privacy go to{" "}
              <span className="text-emerald-200">falco@falco.llc</span>, or use
              the{" "}
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
            <Link href="/terms" className="hover:text-white/70 transition-colors">
              Terms
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
