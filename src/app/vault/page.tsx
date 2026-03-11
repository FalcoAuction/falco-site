'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type VaultListingStatus = "active" | "claimed" | "expired"
type VaultSegment = "top" | "secondary"
type VaultReadinessFilter = "all" | "GREEN" | "YELLOW" | "OTHER"
type VaultContactFilter = "all" | "ready" | "not_ready"

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
  routingState?: "open" | "in_discussion" | "reserved" | "closed"
  routingReservedByEmail?: string
  routingReservedByName?: string
  pursuitRequestCount?: number
}

function statusClasses(status: VaultListingStatus) {
  if (status === "claimed") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-200"
  }

  if (status === "expired") {
    return "border-red-500/20 bg-red-500/10 text-red-200"
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
}

function readinessClasses(readiness?: string) {
  if (readiness === "GREEN") return "text-emerald-200"
  if (readiness === "YELLOW" || readiness === "PARTIAL") return "text-amber-200"
  return "text-white/70"
}

function routingStateCopy(state?: VaultListing["routingState"]) {
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

function getVaultSegment(listing: VaultListing): VaultSegment {
  if (listing.topTierReady) {
    return "top"
  }

  return "secondary"
}

function ListingCard({ listing }: { listing: VaultListing }) {
  const segment = getVaultSegment(listing)
  const criticalDataIssues = listing.dataNotes ?? []

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.6)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs uppercase tracking-[0.24em] text-white/45">
            Vault Listing
          </div>

          <div
            className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${
              segment === "top"
                ? "border-white/20 bg-white text-black"
                : "border-white/10 bg-white/5 text-white/65"
            }`}
          >
            {segment === "top" ? "Priority Review" : "Screened Secondary"}
          </div>
        </div>

        <div
          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${statusClasses(
            listing.status
          )}`}
        >
          {listing.status}
        </div>
      </div>

      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">
        {listing.title}
      </h2>

      <div className="mt-3 text-sm text-white/50">
        {listing.market}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Distress Type
          </div>
          <div className="mt-2 text-sm font-medium text-white/82">
            {listing.distressType}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Auction Window
          </div>
          <div className="mt-2 text-sm font-medium text-white/82">
            {listing.auctionWindow}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Screening Status
          </div>
          <div className={`mt-2 text-sm font-medium ${readinessClasses(listing.auctionReadiness)}`}>
            {listing.validationOutcome
              ? validationOutcomeCopy(listing.validationOutcome)
              : listing.auctionReadiness || "-"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Equity Band
          </div>
          <div className="mt-2 text-sm font-medium text-white/82">
            {listing.equityBand || "-"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Direct Contact Path
          </div>
          <div className="mt-2 text-sm font-medium text-white/82">
            {listing.contactReady ? "Available" : "Thin / Unclear"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Mortgage Lender
          </div>
          <div className="mt-2 text-sm font-medium text-white/82">
            {listing.mortgageLender || "Unavailable"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
            Review Lane
          </div>
          <div className="mt-2 text-sm font-medium text-white/82">
            {listing.executionLane ? executionLaneCopy(listing.executionLane) : routingStateCopy(listing.routingState)}
          </div>
        </div>

      </div>

      <p className="mt-5 text-sm leading-7 text-white/68">
        {listing.publicTeaser}
      </p>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-sm text-white/70">
        Validation: {validationOutcomeCopy(listing.validationOutcome)}. Final execution viability and auction-path fit remain subject to licensed/operator review.
        {listing.validationNote ? ` Note: ${listing.validationNote}` : ""}
      </div>

      {listing.routingState === "in_discussion" && (listing.pursuitRequestCount ?? 0) > 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-sm text-white/70">
          Review note: {listing.pursuitRequestCount} active pursuit request{listing.pursuitRequestCount === 1 ? "" : "s"} in review.
        </div>
      ) : null}

      {listing.routingState === "reserved" ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-sm text-white/70">
          Review note: currently reserved through an active FALCO routing path.
        </div>
      ) : null}

      {criticalDataIssues.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
          Data note: {criticalDataIssues.join(" + ")}.
        </div>
      ) : null}

      <div className="mt-5 text-sm text-white/50">
        Packet: {listing.packetLabel}
      </div>

      {listing.status === "claimed" && listing.claimedBy ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-sm text-white/60">
          Claimed by: {listing.claimedBy}
        </div>
      ) : null}

      {listing.status === "expired" && listing.expiresAt ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 text-sm text-white/60">
          Expired: {listing.expiresAt}
        </div>
      ) : null}

      <div className="mt-8">
        <Link
          href={`/vault/${listing.slug}`}
          className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
        >
          View Listing
        </Link>
      </div>
    </div>
  )
}

export default function VaultPage() {
  const [listings, setListings] = useState<VaultListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "claimed" | "expired">("active")
  const [segmentFilter, setSegmentFilter] = useState<"all" | VaultSegment>("top")
  const [readinessFilter, setReadinessFilter] = useState<VaultReadinessFilter>("all")
  const [countyFilter, setCountyFilter] = useState("all")
  const [contactFilter, setContactFilter] = useState<VaultContactFilter>("all")

  useEffect(() => {
    const loadListings = async () => {
      try {
        setLoading(true)
        setError("")

        const res = await fetch("/api/vault/listings", { cache: "no-store" })
        const data = await res.json()

        if (!res.ok || !data?.ok) {
          setError(data?.error || "Unable to load vault listings.")
          return
        }

        setListings(data.listings || [])
      } catch {
        setError("Unable to load vault listings.")
      } finally {
        setLoading(false)
      }
    }

    loadListings()
  }, [])

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (filter !== "all" && listing.status !== filter) return false
      if (segmentFilter !== "all" && getVaultSegment(listing) !== segmentFilter) return false

      if (readinessFilter !== "all") {
        const readiness = listing.auctionReadiness?.toUpperCase()

        if (readinessFilter === "OTHER") {
          if (readiness === "GREEN" || readiness === "YELLOW") return false
        } else if (readiness !== readinessFilter) {
          return false
        }
      }

      if (countyFilter !== "all" && listing.county !== countyFilter) return false
      if (contactFilter === "ready" && !listing.contactReady) return false
      if (contactFilter === "not_ready" && listing.contactReady) return false

      return true
    })
  }, [contactFilter, countyFilter, filter, listings, readinessFilter, segmentFilter])

  const segmentedListings = useMemo(() => {
    return {
      top: filteredListings.filter((listing) => getVaultSegment(listing) === "top"),
      secondary: filteredListings.filter((listing) => getVaultSegment(listing) === "secondary"),
    }
  }, [filteredListings])

  const counts = useMemo(() => {
    const activeListings = listings.filter((listing) => listing.status === "active")
    const topCount = activeListings.filter((listing) => getVaultSegment(listing) === "top").length

    return {
      all: listings.length,
      active: activeListings.length,
      claimed: listings.filter((listing) => listing.status === "claimed").length,
      expired: listings.filter((listing) => listing.status === "expired").length,
      top: topCount,
      secondary: activeListings.length - topCount,
    }
  }, [listings])

  const counties = useMemo(() => {
    return [...new Set(listings.map((listing) => listing.county).filter(Boolean))].sort()
  }, [listings])

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
            <Link href="/request-access" className="text-sm text-white/65 transition hover:text-white">
              Request Access
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-16 md:px-10 md:pt-24">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/55">
              Closed Access Vault
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-6xl">
              Restricted screened opportunity flow for approved FALCO partners.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
              The vault contains heavily filtered opportunities, operator-facing briefs, and controlled
              distribution paths. Full listing access is available only to approved users and remains
              gated by NDA and non-circumvention acceptance. Final execution viability and auction-path
              fit remain subject to licensed/operator validation.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.6)]">
            <div className="text-xs uppercase tracking-[0.24em] text-white/45">
              Vault Feed
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Total Listings
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {counts.all}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Active
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {counts.active}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Priority Review
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {counts.top}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Screened Secondary
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {counts.secondary}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {[
            ["active", `Active (${counts.active})`],
            ["claimed", `Claimed (${counts.claimed})`],
            ["expired", `Expired (${counts.expired})`],
            ["all", `All (${counts.all})`],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value as "all" | "active" | "claimed" | "expired")}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                filter === value
                  ? "border-white/20 bg-white text-black"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
              Review Tier
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["all", "All Leads"],
                ["top", `Priority Review (${counts.top})`],
                ["secondary", `Screened Secondary (${counts.secondary})`],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSegmentFilter(value as "all" | VaultSegment)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    segmentFilter === value
                      ? "border-white/20 bg-white text-black"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
            <label className="text-[11px] uppercase tracking-[0.22em] text-white/40" htmlFor="vault-readiness-filter">
              Readiness + Contact
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select
                id="vault-readiness-filter"
                value={readinessFilter}
                onChange={(event) => setReadinessFilter(event.target.value as VaultReadinessFilter)}
                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-white/20"
              >
                <option value="all">All Readiness</option>
                <option value="GREEN">GREEN</option>
                <option value="YELLOW">YELLOW</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={contactFilter}
                onChange={(event) => setContactFilter(event.target.value as VaultContactFilter)}
                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-white/20"
              >
                <option value="all">All Contact States</option>
                <option value="ready">Contact Ready</option>
                <option value="not_ready">Not Contact Ready</option>
              </select>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
            <label className="text-[11px] uppercase tracking-[0.22em] text-white/40" htmlFor="vault-county-filter">
              County
            </label>

            <select
              id="vault-county-filter"
              value={countyFilter}
              onChange={(event) => setCountyFilter(event.target.value)}
              className="mt-3 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-white/20"
            >
              <option value="all">All Counties</option>
              {counties.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-28 md:px-10">
        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-sm text-white/60">
            Loading vault feed...
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-sm text-white/60">
            {segmentFilter === "top"
              ? "No listings currently meet the priority-review threshold. Switch to Screened Secondary or All to review the broader vault."
              : "No listings in this queue."}
          </div>
        ) : (
          <div className="space-y-12">
            {segmentedListings.top.length > 0 ? (
              <div>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                      Priority Shelf
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      Priority Review
                    </h2>
                  </div>

                  <div className="text-sm text-white/45">
                    {segmentedListings.top.length} listing{segmentedListings.top.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {segmentedListings.top.map((listing) => (
                    <ListingCard key={listing.slug} listing={listing} />
                  ))}
                </div>
              </div>
            ) : null}

            {segmentedListings.secondary.length > 0 ? (
              <div>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                      Secondary Shelf
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      Screened Secondary
                    </h2>
                  </div>

                  <div className="text-sm text-white/45">
                    {segmentedListings.secondary.length} listing{segmentedListings.secondary.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {segmentedListings.secondary.map((listing) => (
                    <ListingCard key={listing.slug} listing={listing} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}
