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

export default function InquiryForm() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [topic, setTopic] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    start(async () => {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          company,
          topic,
          message,
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
      eyebrow="General inquiry"
      title="Don't fit the other forms? Tell us what you're up to."
      intro="Press, partnerships outside auction, vendors, investor introductions, anyone curious about the model — drop a note. We respond within one business day."
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
            <Field label="Company / org">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputCls}
                placeholder="Optional"
              />
            </Field>
          </div>

          <Field label="What's this about?">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className={inputCls}
              placeholder="Press, partnership, investment, question..."
            />
          </Field>

          <Field label="Your message" required>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className={`${inputCls} resize-y`}
              placeholder="Tell us a little about who you are and what you'd like to talk about..."
            />
          </Field>

          <FormError msg={error} />

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <SubmitButton pending={pending}>Send</SubmitButton>
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
