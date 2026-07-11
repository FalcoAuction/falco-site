import Link from "next/link"
import { ConsentForm } from "./consent-form"

export const metadata = {
  title: "Text Message Opt-In | FALCO Tennessee",
  description:
    "Opt in to receive case-specific text messages from FALCO. Consent is optional, message frequency varies, and you can reply STOP at any time.",
}

// Public SMS opt-in page. This is the URL registered as the web-form
// opt-in in FALCO's A2P 10DLC campaign — it must show the full CTIA
// disclosure set at the point of capture: program description,
// frequency, rate notice, STOP/HELP, and links to privacy + terms.
export default function SmsConsentPage() {
  return (
    <main className="min-h-screen bg-[#060606] text-white selection:bg-emerald-400/20 selection:text-white">
      <div className="absolute inset-0 -z-30 bg-[#060606]" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_45%)]" />

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

      <section className="mx-auto max-w-2xl px-6 pt-16 pb-8 md:px-10 md:pt-24">
        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/75">
          Text message opt-in
        </div>
        <h1 className="mt-4 text-[32px] md:text-[44px] leading-[1.08] tracking-[-0.02em] font-semibold">
          Get your follow-up by text.
        </h1>
        <p className="mt-5 text-[15px] leading-[1.65] text-white/60">
          If you spoke with Patrick Armour about your property and want the
          follow-up over text, opt in below. This is optional. We only text
          people who ask us to.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-16 md:px-10">
        <ConsentForm />

        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-[13px] leading-[1.7] text-white/55 space-y-3">
          <p>
            <strong className="text-white/80">Program:</strong> FALCO sends
            case-specific text messages from Patrick Armour, Tennessee
            licensed auctioneer: follow-up on your conversation, scheduling,
            and answers to your questions. No promotional blasts.
          </p>
          <p>
            <strong className="text-white/80">Frequency:</strong> varies by
            conversation; most cases involve 1 to 10 messages total.
          </p>
          <p>
            <strong className="text-white/80">Cost:</strong> message and data
            rates may apply, per your carrier plan.
          </p>
          <p>
            <strong className="text-white/80">Opt out:</strong> reply STOP to
            any message to stop immediately. Reply HELP for help, or contact{" "}
            <span className="text-emerald-200">falco@falco.llc</span> /
            601-213-8868.
          </p>
          <p>
            Consent is not a condition of any purchase or service. See our{" "}
            <Link href="/privacy" className="text-emerald-300 underline underline-offset-4">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-emerald-300 underline underline-offset-4">
              Terms
            </Link>
            . Opt-in data is never shared with third parties.
          </p>
        </div>
      </section>
    </main>
  )
}
