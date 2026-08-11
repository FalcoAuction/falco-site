import Link from "next/link"
import { ConsentForm } from "./consent-form"

export const metadata = {
  title: "Text Message Opt-In | FALCO Tennessee",
  description:
    "Opt in to receive case-specific text messages from FALCO. Consent is optional, message frequency varies, and you can reply STOP at any time.",
  alternates: { canonical: "/sms-consent" },
}

// Public SMS opt-in page. This is the URL registered as the web-form
// opt-in in FALCO's A2P 10DLC campaign — it must show the full CTIA
// disclosure set at the point of capture: program description,
// frequency, rate notice, STOP/HELP, and links to privacy + terms.
export default function SmsConsentPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)] text-[var(--ink)] selection:bg-[var(--mocha-wash)]">

      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[var(--paper)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-10">
          <Link
            href="/"
            className="text-[13px] font-semibold tracking-[0.28em] text-[var(--ink)] hover:text-[var(--mocha)] transition-colors"
          >
            FALCO
          </Link>
          <Link
            href="/"
            className="text-[12px] tracking-wide text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
          >
            ← Back
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 pt-16 pb-8 md:px-10 md:pt-24">
        <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--mocha)]">
          Text message opt-in
        </div>
        <h1 className="mt-4 text-[32px] md:text-[44px] leading-[1.08] tracking-[-0.02em] font-semibold">
          Get your follow-up by text.
        </h1>
        <p className="mt-5 text-[15px] leading-[1.65] text-[var(--ink-soft)]">
          If you spoke with Patrick Armour about your property and want the
          follow-up over text, opt in below. This is optional. We only text
          people who ask us to.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-16 md:px-10">
        <ConsentForm />

        <div className="mt-8 rounded-2xl border border-[var(--rule)] bg-[var(--paper-raised)] p-6 text-[13px] leading-[1.7] text-[var(--ink-faint)] space-y-3">
          <p>
            <strong className="text-[var(--ink)]">Program:</strong> FALCO sends
            case-specific text messages from Patrick Armour, Tennessee
            licensed auctioneer: follow-up on your conversation, scheduling,
            and answers to your questions. No promotional blasts.
          </p>
          <p>
            <strong className="text-[var(--ink)]">Frequency:</strong> varies by
            conversation; most cases involve 1 to 10 messages total.
          </p>
          <p>
            <strong className="text-[var(--ink)]">Cost:</strong> message and data
            rates may apply, per your carrier plan.
          </p>
          <p>
            <strong className="text-[var(--ink)]">Opt out:</strong> reply STOP to
            any message to stop immediately. Reply HELP for help, or contact{" "}
            <span className="text-[var(--mocha)]">falco@falco.llc</span>.
          </p>
          <p>
            Consent is not a condition of any purchase or service. See our{" "}
            <Link href="/privacy" className="text-[var(--mocha)] underline underline-offset-4">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-[var(--mocha)] underline underline-offset-4">
              Terms
            </Link>
            . Opt-in data is never shared with third parties.
          </p>
        </div>
      </section>
    </main>
  )
}
