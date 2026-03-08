'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

type VaultListingStatus = "active" | "claimed" | "expired"

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

export default function VaultPage() {
  const [listings, setListings] = useState<VaultListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "claimed" | "expired">("active")

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
    if (filter === "all") return listings
    return listings.filter((listing) => listing.status === filter)
  }, [filter, listings])

  const counts = useMemo(() => {
    return {
      all: listings.length,
      active: listings.filter((l) => l.status === "active").length,
      claimed: listings.filter((l) => l.status === "claimed").length,
      expired: listings.filter((l) => l.status === "expired").length,
    }
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
              Restricted opportunity flow for approved FALCO partners.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 md:text-lg">
              The vault contains active opportunities, acquisition briefs, and controlled
              distribution paths. Full listing access is available only to approved users
              and remains gated by NDA and non-circumvention acceptance.
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
                  Claimed
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {counts.claimed}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Expired
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {counts.expired}
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
            No listings in this queue.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredListings.map((listing) => (
              <div
                key={listing.slug}
                className="rounded-[28px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_35px_120px_rgba(0,0,0,0.6)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Vault Listing
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
                      FALCO Score
                    </div>
                    <div className="mt-2 text-sm font-medium text-white/82">
                      {listing.falcoScore ?? "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      Auction Readiness
                    </div>
                    <div className={`mt-2 text-sm font-medium ${readinessClasses(listing.auctionReadiness)}`}>
                      {listing.auctionReadiness || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      Equity Band
                    </div>
                    <div className="mt-2 text-sm font-medium text-white/82">
                      {listing.equityBand || "—"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                      Contact Ready
                    </div>
                    <div className="mt-2 text-sm font-medium text-white/82">
                      {listing.contactReady ? "YES" : "NO"}
                    </div>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-7 text-white/68">
                  {listing.publicTeaser}
                </p>

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
            ))}
          </div>
        )}
      </section>
    </main>
  )
}