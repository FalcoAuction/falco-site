import Link from "next/link"
import { requireDialerSession } from "../require-session"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { COUNTIES } from "@/app/foreclosure/county-list"

export const dynamic = "force-dynamic"
export const metadata = { title: "Surplus watch · FALCO Dialer" }

/**
 * Surplus watch.
 *
 * Leads whose trustee sale has already run are treated as dead by the
 * rest of the pipeline, but a sale that drew a third-party bidder above
 * the debt leaves surplus that legally belongs to the former owner, and
 * most never claim it. Tennessee allows one year from the sale to claim,
 * so these age out on a clock.
 *
 * The estimate uses the Q2 2026 national average third-party foreclosure
 * bid of 67.6% of value (Auction.com). It is a screening number, not a
 * finding: roughly half of auctions revert to the lender and produce no
 * surplus at all, and junior liens are paid before the owner. Treat the
 * list as "worth a phone call", never as "you are owed this".
 */

const BID_RATIO = 0.676

type Row = {
  pipeline_lead_key: string | null
  full_name: string | null
  owner_name_records: string | null
  property_address: string | null
  county: string | null
  phone: string | null
  property_value: number | null
  mortgage_balance: number | null
  trustee_sale_date: string | null
}

const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US")

const countySlug = (county: string | null) => {
  if (!county) return null
  const c = county.toLowerCase().replace(/\s*county\s*/i, "").trim()
  return COUNTIES.find((x) => x.county.toLowerCase() === c)?.slug ?? null
}

export default async function SurplusWatchPage() {
  await requireDialerSession("/dialer/surplus")
  if (!supabaseAdmin) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 text-white/70">
        Supabase isn&apos;t configured.
      </main>
    )
  }

  const { data } = await supabaseAdmin
    .from("homeowner_requests")
    .select(
      "pipeline_lead_key, full_name, owner_name_records, property_address, county, phone, property_value, mortgage_balance, trustee_sale_date"
    )
    .not("trustee_sale_date", "is", null)
    .lt("trustee_sale_date", new Date().toISOString().slice(0, 10))
    .gt("property_value", 0)
    .gt("mortgage_balance", 0)
    .limit(2000)

  const today = Date.now()
  const rows = ((data as Row[]) || [])
    .map((r) => {
      const est = (r.property_value ?? 0) * BID_RATIO - (r.mortgage_balance ?? 0)
      const sale = r.trustee_sale_date ? new Date(r.trustee_sale_date) : null
      // Tennessee: one year from the sale to claim.
      const daysLeft = sale
        ? Math.ceil((sale.getTime() + 365 * 86400000 - today) / 86400000)
        : null
      return { ...r, est, sale, daysLeft }
    })
    .filter((r) => r.est > 5000 && r.daysLeft !== null && r.daysLeft > 0)
    .sort((a, b) => b.est - a.est)

  const total = rows.reduce((s, r) => s + r.est, 0)
  const expiringSoon = rows.filter((r) => (r.daysLeft ?? 999) <= 90).length

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Surplus watch
        </h1>
        <Link href="/dialer" className="text-xs text-white/55 hover:text-white">
          ← Back to queue
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Leads worth a call" value={String(rows.length)} />
        <Stat label="Estimated surplus" value={usd(total)} />
        <Stat label="Expiring in 90 days" value={String(expiringSoon)} warn={expiringSoon > 0} />
      </div>

      <p className="mt-5 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] leading-[1.6] text-amber-100/90">
        These are screening estimates, not findings. Roughly half of
        foreclosure auctions revert to the lender and leave no surplus at
        all; the figure below assumes a third-party bidder at 67.6% of value,
        the Q2 2026 national average. Junior liens are paid before the former
        owner. Confirm the actual sale result with the county before telling
        anyone they are owed money, and take legal advice before charging a
        fee for recovery work: Tennessee regulates this area and FALCO is not
        a law firm.
      </p>

      <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/55">
            <tr>
              <th className="px-3 py-2.5">Owner / property</th>
              <th className="px-3 py-2.5">Sold</th>
              <th className="px-3 py-2.5">Claim window</th>
              <th className="px-3 py-2.5 text-right">Est. surplus</th>
              <th className="px-3 py-2.5">Call</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const slug = countySlug(r.county)
              const urgent = (r.daysLeft ?? 999) <= 90
              return (
                <tr
                  key={r.pipeline_lead_key ?? r.property_address}
                  className="border-t border-white/[0.06] align-top"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-white">
                      {r.owner_name_records || r.full_name || "Owner unknown"}
                    </div>
                    <div className="text-white/50">{r.property_address}</div>
                    <div className="text-white/35">
                      {slug ? (
                        <Link
                          href={`/foreclosure/${slug}`}
                          className="underline underline-offset-2 hover:text-white/70"
                          title="County guide: Clerk & Master contact for surplus"
                        >
                          {r.county} County
                        </Link>
                      ) : (
                        r.county
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-white/70 whitespace-nowrap">
                    {r.trustee_sale_date}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={
                        urgent
                          ? "rounded-full bg-red-500/15 px-2 py-0.5 text-red-200"
                          : "text-white/60"
                      }
                    >
                      {r.daysLeft} days left
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums text-emerald-300">
                    {usd(r.est)}
                  </td>
                  <td className="px-3 py-3">
                    {r.phone ? (
                      <a
                        href={`tel:${r.phone.replace(/\D/g, "")}`}
                        className="rounded-md border border-white/15 px-2.5 py-1.5 text-white/80 hover:border-white/40 hover:text-white whitespace-nowrap"
                      >
                        {r.phone}
                      </a>
                    ) : (
                      <span className="text-white/30">no phone</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="mt-6 text-[14px] text-white/50">
          Nothing inside the one-year claim window right now.
        </p>
      )}
    </main>
  )
}

function Stat({
  label,
  value,
  warn = false,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-white/45">
        {label}
      </div>
      <div
        className={`mt-1 text-[22px] font-bold tabular-nums ${
          warn ? "text-red-300" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  )
}
