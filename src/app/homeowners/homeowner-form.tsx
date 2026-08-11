"use client"

import { useState, useTransition } from "react"
import {
  FormShell,
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  inputCls,
} from "../(forms)/form-shell"

export default function HomeownerForm() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [propertyAddress, setPropertyAddress] = useState("")
  const [county, setCounty] = useState("")
  const [trusteeSaleDate, setTrusteeSaleDate] = useState("")
  const [mortgageBalance, setMortgageBalance] = useState("")
  const [bestCallback, setBestCallback] = useState("")
  const [situationNotes, setSituationNotes] = useState("")
  const [referrer, setReferrer] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    start(async () => {
      const res = await fetch("/api/homeowners/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          propertyAddress,
          county,
          trusteeSaleDate: trusteeSaleDate || null,
          mortgageBalance: mortgageBalance || null,
          bestCallback,
          situationNotes,
          referrer,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.error ?? "Something went wrong. Try again or email falco@falco.llc.")
        return
      }
      setSuccess(body?.message ?? "Got it.")
    })
  }

  return (
    <FormShell
      eyebrow="For homeowners · Tennessee"
      title="A free 15-minute call. Real math. No pitch."
      intro="Tell us about the property. Within one business day we'll come back to you with the actual numbers for your situation: what your home is worth, what you'd walk away with through a marketed auction (the kind a state-licensed auction firm runs — not the trustee sale at the courthouse), and whether that route actually fits. If it doesn't, we'll tell you that plainly."
    >
      {success ? (
        <FormSuccess msg={success} />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Your name" required>
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
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Phone" hint="Best number to reach you">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className={inputCls}
                placeholder="(___) ___-____"
              />
            </Field>
            <Field label="Best time to call">
              <input
                value={bestCallback}
                onChange={(e) => setBestCallback(e.target.value)}
                className={inputCls}
                placeholder="e.g. weekdays after 6pm"
              />
            </Field>
          </div>

          <div className="h-px bg-[var(--rule)]" />

          <Field label="Property address" required>
            <input
              required
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              autoComplete="street-address"
              className={inputCls}
              placeholder="123 Main St, Nashville, TN 37206"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="County" hint="Davidson, Shelby, Knox, etc.">
              <input
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className={inputCls}
                placeholder="County"
              />
            </Field>
            <Field
              label="Trustee sale date"
              hint="If one is scheduled. Leave blank if you're not sure."
            >
              <input
                type="date"
                value={trusteeSaleDate}
                onChange={(e) => setTrusteeSaleDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field
            label="Estimated mortgage balance"
            hint="Rough number is fine. It helps us prepare specific math for the call."
          >
            <input
              inputMode="numeric"
              value={mortgageBalance}
              onChange={(e) => setMortgageBalance(e.target.value)}
              className={inputCls}
              placeholder="e.g. 285000"
            />
          </Field>

          <Field label="Anything we should know? (Optional)">
            <textarea
              value={situationNotes}
              onChange={(e) => setSituationNotes(e.target.value)}
              rows={4}
              className={`${inputCls} resize-y`}
              placeholder="Other liens, second mortgages, occupancy, what you've already tried, what you're hoping happens..."
            />
          </Field>

          <Field label="How'd you find us?">
            <input
              value={referrer}
              onChange={(e) => setReferrer(e.target.value)}
              className={inputCls}
              placeholder="Google, attorney, family, neighbor, etc."
            />
          </Field>

          <FormError msg={error} />

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <SubmitButton pending={pending}>Send my request</SubmitButton>
            <div className="text-[11px] text-[var(--ink-faint)]">
              We respond within one business day from{" "}
              <span className="text-[var(--ink-soft)]">falco@falco.llc</span>. Nothing you tell us is shared.
            </div>
          </div>
        </form>
      )}
    </FormShell>
  )
}
