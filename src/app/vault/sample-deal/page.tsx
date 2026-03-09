'use client'

import Link from "next/link"
import { useEffect, useState } from "react"

const LISTING_SLUG = "sample-deal"

function hasAgreementCookie() {
  return document.cookie
    .split("; ")
    .some((cookie) => cookie.startsWith(`falco_vault_access_${LISTING_SLUG}=accepted`))
}

function getApprovedEmailCookie() {
  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("falco_vault_approved_email="))

  if (!match) return ""
  return decodeURIComponent(match.split("=")[1] || "")
}

export default function SampleDealPage() {
  const [approved, setApproved] = useState(false)
  const [approvedEmail, setApprovedEmail] = useState("")
  const [emailCheck, setEmailCheck] = useState("")
  const [approvalSubmitting, setApprovalSubmitting] = useState(false)
  const [approvalError, setApprovalError] = useState("")

  const [accepted, setAccepted] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [ndaAccepted, setNdaAccepted] = useState(false)
  const [nonCircAccepted, setNonCircAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const storedApprovedEmail = getApprovedEmailCookie()
    if (storedApprovedEmail) {
      setApproved(true)
      setApprovedEmail(storedApprovedEmail)
      setEmail(storedApprovedEmail)
      setEmailCheck(storedApprovedEmail)
    }

    setAccepted(hasAgreementCookie())
  }, [])

  const handleApprovalCheck = async () => {
    setApprovalError("")

    if (!emailCheck.trim()) {
      setApprovalError("Approved email is required.")
      return
    }

    try {
      setApprovalSubmitting(true)

      const res = await fetch("/api/access/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailCheck,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok || !data?.approved) {
        setApprovalError(data?.error || "Unable to verify vault access.")
        return
      }

      setApproved(true)
      setApprovedEmail(data.email || emailCheck)
      setEmail(data.email || emailCheck)
      setSuccess("")
    } catch {
      setApprovalError("Unable to verify approval.")
    } finally {
      setApprovalSubmitting(false)
    }
  }

  const handleAccept = async () => {
    setError("")
    setSuccess("")

    if (!fullName.trim() || !email.trim()) {
      setError("Full name and email are required.")
      return
    }

    if (!ndaAccepted || !nonCircAccepted) {
      setError("You must accept both the NDA and non-circumvention terms.")
      return
    }

    try {
      setSubmitting(true)

      const res = await fetch("/api/vault/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingSlug: LISTING_SLUG,
          fullName,
          email,
          ndaAccepted,
          nonCircAccepted,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Unable to record acceptance.")
        return
      }

      setSuccess("Acceptance recorded.")
      setAccepted(true)
    } catch {
      setError("Unable to record acceptance.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-20 bg-black" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_16%,transparent_82%,rgba(255,255,255,0.02))]" />

      <header className="border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="text-sm font-semibold tracking-[0.28em] text-white">
            FALCO
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/vault" className="text-sm text-white/65 transition hover:text-white">
              ← Back to Vault
            </Link>
          </div>
        </div>
      </header>

      {!approved ? (
        <section className="mx-auto max-w-4xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.65)] md:p-10">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
              Approved Access Required
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-5xl">
              Verify your approved vault email.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-7 text-white/68 md:text-lg">
              This listing is available only to users whose access request has been approved.
              Verify your approved email first. After approval is confirmed, you will still
              need to accept the NDA and non-circumvention terms before entering the listing.
            </p>

            <div className="mt-8 grid gap-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">Approved Email</label>
                <input
                  value={emailCheck}
                  onChange={(e) => setEmailCheck(e.target.value)}
                  type="email"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                  placeholder="you@firm.com"
                />
              </div>
            </div>

            {approvalError ? (
              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {approvalError}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={handleApprovalCheck}
                disabled={approvalSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {approvalSubmitting ? "Verifying..." : "Verify Approved Access"}
              </button>

              <Link
                href="/request-access"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
              >
                Request Access
              </Link>
            </div>
          </div>
        </section>
      ) : !accepted ? (
        <section className="mx-auto max-w-4xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.65)] md:p-10">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
              Restricted Listing
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-5xl">
              NDA and non-circumvention acceptance required.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-7 text-white/68 md:text-lg">
              Approved access has been verified for <span className="text-white">{approvedEmail}</span>.
              This opportunity is still confidential. Access to the full listing, packet, and
              deal path is restricted to users who agree not to disclose, distribute, bypass,
              or circumvent FALCO, its partners, or the origin of the opportunity.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-6">
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                  NDA
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                  <li>• Listing details are confidential.</li>
                  <li>• Packet contents may not be shared without permission.</li>
                  <li>• Information is for evaluation only.</li>
                  <li>• Unauthorized disclosure is prohibited.</li>
                </ul>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-6">
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Non-Circumvention
                </div>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                  <li>• You may not bypass FALCO or its partners.</li>
                  <li>• You may not contact deal parties to cut out FALCO.</li>
                  <li>• You may not replicate or redistribute the opportunity.</li>
                  <li>• All access is subject to FALCO-controlled routing.</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                  placeholder="Your full legal name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                  placeholder="you@firm.com"
                  type="email"
                />
              </div>
            </div>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.035] p-6">
              <div className="space-y-4 text-sm text-white/68">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={ndaAccepted}
                    onChange={(e) => setNdaAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I have read and agree to the confidentiality and non-disclosure restrictions.
                  </span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={nonCircAccepted}
                    onChange={(e) => setNonCircAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I agree not to bypass, circumvent, or cut out FALCO or its partners in connection with this opportunity.
                  </span>
                </label>
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/80">
                {success}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={handleAccept}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Recording Acceptance..." : "Accept and Enter Listing"}
              </button>

              <Link
                href="/request-access"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10"
              >
                Request Formal Access
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
                Confidential Listing
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
                Davidson County Residential Foreclosure
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                This private listing represents an auction-timed residential opportunity
                currently inside the FALCO pipeline. Full address, underwriting packet,
                and route-to-close workflow are restricted to approved partners.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Market
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">
                    Nashville, Tennessee
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Distress Type
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">
                    Foreclosure
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Auction Window
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">
                    21–60 Days
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Access Status
                  </div>
                  <div className="mt-3 text-lg font-semibold text-white">
                    Vault Open
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.65)]">
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                Listing Summary
              </div>

              <div className="mt-6 space-y-5 text-sm leading-7 text-white/68">
                <p>
                  Address-level packet, underwriting detail, and deal contacts remain
                  controlled within the vault environment.
                </p>
                <p>
                  Distribution of this opportunity outside the approved FALCO path is
                  prohibited by the accepted NDA and non-circumvention terms.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <a
                  href="#"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/82 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span>View Full Packet</span>
                  <span className="text-white/40">→</span>
                </a>

                <a
                  href="mailto:access@falco.llc?subject=Falco%20Vault%20Listing%20Inquiry"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/82 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span>Request Deal Discussion</span>
                  <span className="text-white/40">→</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
