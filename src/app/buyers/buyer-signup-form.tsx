"use client"

import { useState, useTransition } from "react"

export default function BuyerSignupForm() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [counties, setCounties] = useState("")
  const [propertyTypes, setPropertyTypes] = useState("")
  const [strategies, setStrategies] = useState("")
  const [cashReady, setCashReady] = useState(false)
  const [fundingSource, setFundingSource] = useState("")
  const [closeSpeedDays, setCloseSpeedDays] = useState("")
  const [notes, setNotes] = useState("")
  const [referrer, setReferrer] = useState("")

  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    start(async () => {
      const res = await fetch("/api/buyers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          company,
          priceMin: priceMin || null,
          priceMax: priceMax || null,
          counties,
          propertyTypes,
          strategies,
          cashReady,
          fundingSource,
          closeSpeedDays: closeSpeedDays || null,
          notes,
          referrer,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.error ?? "Registration failed.")
        return
      }
      setSuccess(body?.message ?? "You're on the list.")
    })
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
        <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300 mb-2">Registered</div>
        <div className="text-white text-lg font-semibold mb-1">{success}</div>
        <div className="text-xs text-emerald-100/70 mt-3">
          You'll hear from us when matching Tennessee inventory lists. Typically 2–8 new listings per month.
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name" required>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className={inputCls}
            placeholder="Your name"
          />
        </Field>
        <Field label="Email" required>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputCls}
            placeholder="you@company.com"
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            className={inputCls}
            placeholder="(___) ___-____"
          />
        </Field>
        <Field label="Company / team">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputCls}
            placeholder="Optional"
          />
        </Field>
      </div>

      <div className="h-px bg-white/[0.06]" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Target price min (USD)">
          <input
            inputMode="numeric"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className={inputCls}
            placeholder="150000"
          />
        </Field>
        <Field label="Target price max (USD)">
          <input
            inputMode="numeric"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className={inputCls}
            placeholder="500000"
          />
        </Field>
      </div>

      <Field label="Counties / metros (comma-separated)">
        <input
          value={counties}
          onChange={(e) => setCounties(e.target.value)}
          className={inputCls}
          placeholder="Davidson, Rutherford, Shelby, Knox..."
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Property types">
          <input
            value={propertyTypes}
            onChange={(e) => setPropertyTypes(e.target.value)}
            className={inputCls}
            placeholder="SFR, duplex, small multi..."
          />
        </Field>
        <Field label="Strategy">
          <input
            value={strategies}
            onChange={(e) => setStrategies(e.target.value)}
            className={inputCls}
            placeholder="Flip, buy-hold, subto, creative..."
          />
        </Field>
      </div>

      <div className="h-px bg-white/[0.06]" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Funding source">
          <input
            value={fundingSource}
            onChange={(e) => setFundingSource(e.target.value)}
            className={inputCls}
            placeholder="Cash, lender name, HELOC, JV..."
          />
        </Field>
        <Field label="Typical close speed (days)">
          <input
            inputMode="numeric"
            value={closeSpeedDays}
            onChange={(e) => setCloseSpeedDays(e.target.value)}
            className={inputCls}
            placeholder="e.g. 14"
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 cursor-pointer py-1">
        <input
          type="checkbox"
          checked={cashReady}
          onChange={(e) => setCashReady(e.target.checked)}
          className="h-4 w-4 accent-emerald-400"
        />
        <span className="text-sm text-white/85">I can close all-cash, no lender contingency.</span>
      </label>

      <Field label="How'd you find us?">
        <input
          value={referrer}
          onChange={(e) => setReferrer(e.target.value)}
          className={inputCls}
          placeholder="LinkedIn, BiggerPockets, referral, Google..."
        />
      </Field>

      <Field label="Anything else we should know? (Optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={`${inputCls} resize-y`}
          placeholder="Specific deals you're hunting, avoid criteria, timeline..."
        />
      </Field>

      {error && (
        <div className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm py-3 transition-colors"
      >
        {pending ? "Registering..." : "Get Early Access to TN Inventory"}
      </button>

      <p className="text-[10px] text-white/35 text-center">
        We'll email you when inventory matches your buy box. No spam, no list-selling, unsubscribe anytime.
      </p>
    </form>
  )
}

const inputCls =
  "w-full rounded-md bg-black/40 border border-white/12 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/40"

function Field({
  label,
  children,
  required = false,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.18em] text-white/55 mb-1.5">
        {label}
        {required && <span className="text-emerald-400/60 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}
