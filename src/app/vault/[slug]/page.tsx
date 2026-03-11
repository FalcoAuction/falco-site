'use client'

import Link from "next/link"
import { useEffect, useState } from "react"

type VaultListingStatus = "active" | "claimed" | "expired"
type VaultRoutingState = "open" | "in_discussion" | "reserved" | "closed"

type VaultListing = {
  slug: string
  title: string
  market: string
  county: string
  status: VaultListingStatus
  distressType: string
  auctionWindow: string
  summary: string
  publicTeaser: string
  packetUrl: string
  packetLabel: string
  sourceLeadKey: string
  createdAt: string
  expiresAt?: string
  claimedAt?: string
  claimedBy?: string
  falcoScore?: number | null
  auctionReadiness?: string
  equityBand?: string
  dtsDays?: number | null
  contactReady?: boolean
  propertyIdentifier?: string
  ownerName?: string
  ownerMail?: string
  lastSaleDate?: string
  mortgageLender?: string
  yearBuilt?: number | null
  buildingAreaSqft?: number | null
  beds?: number | null
  baths?: number | null
  topTierReady?: boolean
  vaultPublishReady?: boolean
  dataNotes?: string[]
  validationOutcome?:
    | "validated_execution_path"
    | "needs_more_info"
    | "no_real_control_path"
    | "low_leverage"
    | "dead_lead"
  executionLane?: "borrower_side" | "lender_trustee" | "auction_only" | "mixed" | "unclear"
  validationNote?: string
  routingState?: VaultRoutingState
  routingReservedByEmail?: string
  routingReservedByName?: string
  pursuitRequestCount?: number
}

type PursuitState = {
  routingState: VaultRoutingState
  requestCount: number
  reservedByCurrentUser: boolean
  hasRequestedByCurrentUser: boolean
}

function hasAgreementCookie(slug: string) {
  return document.cookie
    .split("; ")
    .some((cookie) => cookie.startsWith(`falco_vault_access_${slug}=accepted`))
}

function getApprovedEmailCookie() {
  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("falco_vault_approved_email="))

  if (!match) return ""
  return decodeURIComponent(match.split("=")[1] || "")
}

function readinessClasses(readiness?: string) {
  if (readiness === "GREEN") return "text-emerald-200"
  if (readiness === "YELLOW" || readiness === "PARTIAL") return "text-amber-200"
  return "text-white/70"
}

function routingStateCopy(state: VaultRoutingState) {
  if (state === "reserved") return "Reserved"
  if (state === "in_discussion") return "In Discussion"
  if (state === "closed") return "Closed"
  return "Open"
}

function validationOutcomeCopy(value?: VaultListing["validationOutcome"]) {
  if (value === "validated_execution_path") return "Partner Validated"
  if (value === "needs_more_info") return "Needs More Info"
  if (value === "no_real_control_path") return "No Control Path"
  if (value === "low_leverage") return "Low Leverage"
  if (value === "dead_lead") return "Dead Lead"
  return "Pending Validation"
}

function executionLaneCopy(value?: VaultListing["executionLane"]) {
  if (value === "borrower_side") return "Borrower Side"
  if (value === "lender_trustee") return "Lender / Trustee"
  if (value === "auction_only") return "Auction Only"
  if (value === "mixed") return "Mixed"
  return "Unclear"
}

function isTopLead(listing: VaultListing) {
  return listing.topTierReady === true
}

export default function VaultListingPage() {
  const [slug, setSlug] = useState("")
  const [listing, setListing] = useState<VaultListing | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

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

  const [pursuitMessage, setPursuitMessage] = useState("")
  const [pursuitLoading, setPursuitLoading] = useState(false)
  const [pursuitSubmitting, setPursuitSubmitting] = useState(false)
  const [pursuitError, setPursuitError] = useState("")
  const [pursuitSuccess, setPursuitSuccess] = useState("")
  const [pursuitState, setPursuitState] = useState<PursuitState>({
    routingState: "open",
    requestCount: 0,
    reservedByCurrentUser: false,
    hasRequestedByCurrentUser: false,
  })

  const loadPursuitState = async (listingSlug: string) => {
    if (!listingSlug) return

    try {
      setPursuitLoading(true)
      const res = await fetch(`/api/vault/pursuit?slug=${encodeURIComponent(listingSlug)}`, {
        cache: "no-store",
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) return

      setPursuitState({
        routingState: data.routingState || "open",
        requestCount: Number(data.requestCount || 0),
        reservedByCurrentUser: Boolean(data.reservedByCurrentUser),
        hasRequestedByCurrentUser: Boolean(data.hasRequestedByCurrentUser),
      })
    } finally {
      setPursuitLoading(false)
    }
  }

  useEffect(() => {
    const pathParts = window.location.pathname.split("/").filter(Boolean)
    const currentSlug = pathParts[pathParts.length - 1] || ""
    setSlug(currentSlug)

    const storedApprovedEmail = getApprovedEmailCookie()
    if (storedApprovedEmail) {
      setApproved(true)
      setApprovedEmail(storedApprovedEmail)
      setEmail(storedApprovedEmail)
      setEmailCheck(storedApprovedEmail)
    }

    if (currentSlug) {
      setAccepted(hasAgreementCookie(currentSlug))
      void loadPursuitState(currentSlug)
    }

    const loadListing = async () => {
      try {
        setLoading(true)
        setLoadError("")

        const res = await fetch("/api/vault/listings", { cache: "no-store" })
        const data = await res.json()

        if (!res.ok || !data?.ok) {
          setLoadError(data?.error || "Unable to load vault listing.")
          return
        }

        const found = (data.listings || []).find(
          (item: VaultListing) => item.slug === currentSlug
        )

        if (!found) {
          setLoadError("Listing not found.")
          return
        }

        setListing(found)
      } catch {
        setLoadError("Unable to load vault listing.")
      } finally {
        setLoading(false)
      }
    }

    void loadListing()
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
      await loadPursuitState(slug)
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
          listingSlug: slug,
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
      await loadPursuitState(slug)
    } catch {
      setError("Unable to record acceptance.")
    } finally {
      setSubmitting(false)
    }
  }

  const handlePursuitRequest = async () => {
    setPursuitError("")
    setPursuitSuccess("")

    try {
      setPursuitSubmitting(true)

      const res = await fetch("/api/vault/pursuit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingSlug: slug,
          fullName: fullName || approvedEmail,
          message: pursuitMessage,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        setPursuitError(data?.error || "Unable to submit pursuit request.")
        return
      }

      setPursuitSuccess("Pursuit request submitted. FALCO will control routing from here.")
      await loadPursuitState(slug)
    } catch {
      setPursuitError("Unable to submit pursuit request.")
    } finally {
      setPursuitSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white md:px-10">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-sm text-white/60">
          Loading listing...
        </div>
      </main>
    )
  }

  if (loadError || !listing) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white md:px-10">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/[0.045] p-8">
          <div className="text-2xl font-semibold text-white">Vault Listing</div>
          <div className="mt-4 text-sm text-white/60">
            {loadError || "Listing not found."}
          </div>
          <div className="mt-6">
            <Link
              href="/vault"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/10"
            >
              Back to Vault
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const packetBlockedByRouting =
    pursuitState.routingState === "closed" ||
    (pursuitState.routingState === "reserved" && !pursuitState.reservedByCurrentUser)
  const commercialShare = isTopLead(listing) ? "30%" : "20%"
  const criticalDataIssues = listing.dataNotes ?? []

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
              Back to Vault
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
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-16 md:px-10 md:pt-24">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.65)] md:p-10">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
              Restricted Listing
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-5xl">
              NDA and non-circumvention acceptance required.
            </h1>

            <p className="mt-6 max-w-4xl text-base leading-7 text-white/68 md:text-lg">
              Approved access has been verified for <span className="text-white">{approvedEmail}</span>.
              This screened opportunity is confidential. Access to the listing, packet, and review path is restricted
              to users who agree not to disclose, distribute, bypass, or circumvent FALCO, its partners, or the
              origin of the opportunity. Final execution viability remains subject to licensed/operator validation.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">FALCO Score</div>
                <div className="mt-2 text-sm font-medium text-white/82">{listing.falcoScore ?? "-"}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Screening Status</div>
                <div className={`mt-2 text-sm font-medium ${readinessClasses(listing.auctionReadiness)}`}>
                  {listing.validationOutcome ? validationOutcomeCopy(listing.validationOutcome) : listing.auctionReadiness || "-"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Equity Band</div>
                <div className="mt-2 text-sm font-medium text-white/82">{listing.equityBand || "-"}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Days Until Scheduled Sale</div>
                <div className="mt-2 text-sm font-medium text-white/82">{listing.dtsDays ?? "-"}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Mortgage Lender</div>
                <div className="mt-2 text-sm font-medium text-white/82">{listing.mortgageLender || "Unavailable"}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Review Stage</div>
                <div className="mt-2 text-sm font-medium text-white/82">
                  {listing.executionLane ? executionLaneCopy(listing.executionLane) : routingStateCopy(pursuitState.routingState)}
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-6">
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">NDA</div>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                  <li>Listing details are confidential.</li>
                  <li>Packet contents may not be shared without permission.</li>
                  <li>Information is for evaluation only.</li>
                  <li>Unauthorized disclosure is prohibited.</li>
                </ul>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-6">
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">Non-Circumvention</div>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                  <li>You may not bypass FALCO or its partners.</li>
                  <li>You may not contact deal parties to cut out FALCO.</li>
                  <li>You may not replicate or redistribute the opportunity.</li>
                  <li>All access is subject to FALCO-controlled routing.</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.035] p-6">
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                Peregrine Realty Group Commercial Term
              </div>
              <p className="mt-4 text-sm leading-7 text-white/68">
                By entering this listing, you acknowledge that any executed FALCO-originated
                opportunity introduced or routed through Peregrine Realty Group remains protected.
                If you pursue, close, or otherwise monetize a protected opportunity through the
                FALCO / Peregrine channel, the applicable success fee / revenue share remains
                <span className="text-white"> {commercialShare} of partner-side net revenue</span>, payable
                only upon successful execution, subject to the governing agreement and applicable law.
              </p>
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
                  <span>I have read and agree to the confidentiality and non-disclosure restrictions.</span>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={nonCircAccepted}
                    onChange={(e) => setNonCircAccepted(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I agree not to bypass, circumvent, or cut out FALCO, Peregrine Realty Group,
                    or their partners in connection with this opportunity, and I acknowledge the
                    protected {commercialShare} success-only commercial structure described above.
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
                Confidential Operator Review
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
                {listing.title}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
                {listing.summary}
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/70">
                Validation status: <span className="text-white/82">{validationOutcomeCopy(listing.validationOutcome)}</span>.
                {" "}Final execution viability, control path, and auction fit remain subject to licensed/operator review.
                {listing.validationNote ? <span> Note: <span className="text-white/82">{listing.validationNote}</span>.</span> : null}
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-xs uppercase tracking-[0.22em] text-white/45">Market</div><div className="mt-3 text-lg font-semibold text-white">{listing.market}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-xs uppercase tracking-[0.22em] text-white/45">Distress Type</div><div className="mt-3 text-lg font-semibold text-white">{listing.distressType}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-xs uppercase tracking-[0.22em] text-white/45">Auction Window</div><div className="mt-3 text-lg font-semibold text-white">{listing.auctionWindow}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-xs uppercase tracking-[0.22em] text-white/45">FALCO Score</div><div className="mt-3 text-lg font-semibold text-white">{listing.falcoScore ?? "-"}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-xs uppercase tracking-[0.22em] text-white/45">Screening Status</div><div className={`mt-3 text-lg font-semibold ${readinessClasses(listing.auctionReadiness)}`}>{listing.validationOutcome ? validationOutcomeCopy(listing.validationOutcome) : listing.auctionReadiness || "-"}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-xs uppercase tracking-[0.22em] text-white/45">Equity Band</div><div className="mt-3 text-lg font-semibold text-white">{listing.equityBand || "-"}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-xs uppercase tracking-[0.22em] text-white/45">Days Until Scheduled Sale</div><div className="mt-3 text-lg font-semibold text-white">{listing.dtsDays ?? "-"}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-xs uppercase tracking-[0.22em] text-white/45">Direct Contact Path</div><div className="mt-3 text-lg font-semibold text-white">{listing.contactReady ? "Available" : "Thin / Unclear"}</div></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-xs uppercase tracking-[0.22em] text-white/45">Suggested Lane</div><div className="mt-3 text-lg font-semibold text-white">{executionLaneCopy(listing.executionLane)}</div></div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.65)]">
              <div className="text-xs uppercase tracking-[0.24em] text-white/45">Listing Summary</div>

              <div className="mt-6 space-y-5 text-sm leading-7 text-white/68">
                <p>{listing.publicTeaser}</p>
                <p>This dossier is intended for operator review. Final execution viability, control path, and auction fit remain subject to licensed/operator validation.</p>
                <p>Distribution of this opportunity outside the approved FALCO path is prohibited by the accepted NDA and non-circumvention terms.</p>
              </div>

              {criticalDataIssues.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
                  Data note: {criticalDataIssues.join(" + ")}.
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/70">
                <div>Last Transfer: <span className="text-white/82">{listing.lastSaleDate || "Unavailable"}</span></div>
                <div className="mt-2">Parcel / APN: <span className="text-white/82">{listing.propertyIdentifier || "Unavailable"}</span></div>
                <div className="mt-2">Owner Mailing: <span className="text-white/82">{listing.ownerMail || "Unavailable"}</span></div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/70">
                {pursuitState.routingState === "open"
                  ? "Partner review is open. Approved partners may review the packet and request a controlled execution path review."
                  : pursuitState.routingState === "in_discussion"
                  ? `Partner review is already in discussion with ${pursuitState.requestCount} active request${pursuitState.requestCount === 1 ? "" : "s"}. FALCO still controls next-step routing.`
                  : pursuitState.routingState === "reserved" && pursuitState.reservedByCurrentUser
                  ? "This listing is currently reserved to your approved vault email."
                  : pursuitState.routingState === "reserved"
                  ? "This listing is currently reserved through another active FALCO routing path."
                  : "This listing is closed for further review routing."}
              </div>

              <div className="mt-8 space-y-4">
                {packetBlockedByRouting ? (
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 text-sm text-white/45">
                    <span>{listing.packetLabel}</span>
                    <span>Unavailable</span>
                  </div>
                ) : (
                  <a
                    href={listing.packetUrl}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/82 transition hover:border-white/25 hover:bg-white/[0.06]"
                  >
                    <span>{listing.packetLabel}</span>
                    <span className="text-white/40">&gt;</span>
                  </a>
                )}

                <a
                  href="mailto:access@falco.llc?subject=Falco%20Vault%20Listing%20Inquiry"
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/82 transition hover:border-white/25 hover:bg-white/[0.06]"
                >
                  <span>Request Deal Discussion</span>
                  <span className="text-white/40">&gt;</span>
                </a>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">Operator Review Request</div>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  Viewing a packet does not certify final readiness or claim the opportunity. If you want FALCO to route this listing toward your channel for execution review, submit a request below.
                </p>

                <textarea
                  value={pursuitMessage}
                  onChange={(e) => setPursuitMessage(e.target.value)}
                  className="mt-4 min-h-[110px] w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
                  placeholder="Optional: note channel fit, buyer profile, control-path view, or intended execution lane."
                  disabled={pursuitSubmitting || packetBlockedByRouting || pursuitState.hasRequestedByCurrentUser}
                />

                {pursuitError ? (
                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {pursuitError}
                  </div>
                ) : null}

                {pursuitSuccess ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/80">
                    {pursuitSuccess}
                  </div>
                ) : null}

                <div className="mt-4">
                  <button
                    onClick={handlePursuitRequest}
                    disabled={pursuitLoading || pursuitSubmitting || packetBlockedByRouting || pursuitState.hasRequestedByCurrentUser}
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.08] disabled:text-white/40"
                  >
                    {pursuitState.hasRequestedByCurrentUser
                      ? "Pursuit Requested"
                      : pursuitSubmitting
                      ? "Submitting..."
                      : "Request Review Path"}
                  </button>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">Source Lead</div>
                <div className="mt-3 break-all text-sm text-white/68">{listing.sourceLeadKey}</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
