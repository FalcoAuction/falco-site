import { redirect } from "next/navigation"
import { readDialerSessionFromCookies } from "@/lib/dialer-session"
import { findDialerAcceptance, DIALER_NDA_VERSION, DIALER_NONCIRC_VERSION } from "@/lib/dialer-acceptance"
import AgreementForm from "./agreement-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Agreement · FALCO Dialer",
}

export default async function AgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const session = await readDialerSessionFromCookies()
  if (!session) {
    redirect("/dialer/login")
  }
  const params = await searchParams
  const nextPath = params.next || "/dialer"

  // If the email already has a recorded acceptance, skip straight through.
  if (session.email) {
    const existing = await findDialerAcceptance(session.email)
    if (existing) {
      redirect(nextPath)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Confidentiality &amp; Non-Circumvention</h1>
        <p className="mt-1 text-sm text-white/60">
          One-time agreement before you access the dialer. Required by FALCO LLC.
        </p>
      </div>

      <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-6 text-white/85 space-y-5 max-h-[60vh] overflow-y-auto">
        <section>
          <h2 className="text-base font-semibold text-white">1. Confidentiality (NDA)</h2>
          <p className="mt-2 text-white/75">
            All lead data, contact information, valuations, mortgage details, and homeowner
            communications you encounter in this system are confidential and proprietary to
            FALCO LLC. You agree not to disclose, share, copy, screenshot, export, or transmit
            any of this information to any third party — including other investors, wholesalers,
            family members, or competitors — without written permission from FALCO.
          </p>
          <p className="mt-2 text-white/75">
            This obligation continues for two (2) years from the date of your last access to
            this system, regardless of whether you remain an operator, contractor, or partner
            with FALCO.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">2. Non-Circumvention</h2>
          <p className="mt-2 text-white/75">
            You agree that any homeowner, lead, contact, lender, attorney, auction company,
            or other party introduced to you through this system is a relationship belonging
            to FALCO. You will not directly or indirectly contact, transact with, solicit,
            or otherwise engage any such party for your own benefit, or for the benefit of
            anyone other than FALCO and its designated auction partner, without FALCO's
            prior written consent.
          </p>
          <p className="mt-2 text-white/75">
            This includes — but is not limited to — buying, selling, wholesaling, optioning,
            assigning, marketing, or referring any property surfaced by FALCO outside the
            FALCO + auction-partner workflow.
          </p>
          <p className="mt-2 text-white/75">
            Non-circumvention obligations remain in force for two (2) years from the date
            of your last access. If you breach this section, FALCO is entitled to recover
            any commissions, profits, or fees you earned from the breach, plus reasonable
            legal costs.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">3. Acceptable Use</h2>
          <p className="mt-2 text-white/75">
            You will use this system only to (a) call homeowners about FALCO&apos;s
            auction-listing program and (b) book qualified follow-up calls with the FALCO
            auction partner. You will not use it to make purchase offers, sign contracts,
            negotiate terms, or represent yourself as a buyer.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">4. No Employment Relationship</h2>
          <p className="mt-2 text-white/75">
            Your access to this system does not create an employment, agency, or joint-venture
            relationship with FALCO. Compensation, if any, is governed by a separate written
            agreement.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">5. Acceptance</h2>
          <p className="mt-2 text-white/75">
            By clicking &quot;I agree&quot; below, you acknowledge that you have read this
            agreement, understand it, and agree to be bound by its terms. Your acceptance is
            recorded with your email, IP address, and timestamp.
          </p>
        </section>

        <p className="text-[11px] text-white/40 pt-2 border-t border-white/10">
          NDA version: {DIALER_NDA_VERSION} · Non-Circumvention version: {DIALER_NONCIRC_VERSION}
        </p>
      </article>

      <AgreementForm
        callerName={session.caller}
        email={session.email ?? ""}
        nextPath={nextPath}
      />
    </main>
  )
}
