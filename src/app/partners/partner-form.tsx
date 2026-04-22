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

export default function PartnerForm() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [phone, setPhone] = useState("")
  const [countyCoverage, setCountyCoverage] = useState("")
  const [dealsPerYear, setDealsPerYear] = useState("")
  const [yearsInBusiness, setYearsInBusiness] = useState("")
  const [feeStructure, setFeeStructure] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    start(async () => {
      const res = await fetch("/api/partners/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          company,
          phone,
          countyCoverage,
          dealsPerYear: dealsPerYear || null,
          yearsInBusiness: yearsInBusiness || null,
          feeStructure,
          notes,
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
      eyebrow="For auction partners · Tennessee"
      title="Open a partnership conversation."
      intro="If you run a Tennessee auction company and you'd rather not spend your week sourcing inventory, that's exactly what we do. Tell us a little about your operation and we'll come back within one business day to set up a call."
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
                placeholder="you@yourcompany.com"
              />
            </Field>
            <Field label="Company">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputCls}
                placeholder="Your auction company name"
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
          </div>

          <div className="h-px bg-white/[0.06]" />

          <Field
            label="County coverage"
            hint="Where do you currently operate? Comma-separated is fine."
          >
            <input
              value={countyCoverage}
              onChange={(e) => setCountyCoverage(e.target.value)}
              className={inputCls}
              placeholder="Davidson, Rutherford, Williamson, Shelby..."
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Deals per year (rough)">
              <input
                inputMode="numeric"
                value={dealsPerYear}
                onChange={(e) => setDealsPerYear(e.target.value)}
                className={inputCls}
                placeholder="e.g. 40"
              />
            </Field>
            <Field label="Years in business">
              <input
                inputMode="numeric"
                value={yearsInBusiness}
                onChange={(e) => setYearsInBusiness(e.target.value)}
                className={inputCls}
                placeholder="e.g. 12"
              />
            </Field>
          </div>

          <Field
            label="Fee structure"
            hint="Buyer's premium only, seller commission, hybrid — whatever you typically run."
          >
            <input
              value={feeStructure}
              onChange={(e) => setFeeStructure(e.target.value)}
              className={inputCls}
              placeholder="e.g. 8% buyer's premium, no seller commission"
            />
          </Field>

          <Field label="Anything else? (Optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={`${inputCls} resize-y`}
              placeholder="Specialties, current pipeline gaps, what you'd want to see in a partnership..."
            />
          </Field>

          <FormError msg={error} />

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <SubmitButton pending={pending}>Open the conversation</SubmitButton>
            <div className="text-[11px] text-white/40">
              We respond within one business day from{" "}
              <span className="text-white/65">falco@falco.llc</span>.
            </div>
          </div>
        </form>
      )}
    </FormShell>
  )
}
