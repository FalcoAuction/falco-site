"use client"

import { useState } from "react"

const CONSENT_TEXT =
  "I agree to receive case-specific text messages from FALCO (Patrick Armour, TN licensed auctioneer) at the number I provided. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time. Consent is not a condition of any purchase or service."

export function ConsentForm() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [property, setProperty] = useState("")
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle")
  const [message, setMessage] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState("busy")
    setMessage("")
    try {
      const res = await fetch("/api/sms/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          property,
          consent,
          consent_text: CONSENT_TEXT,
          website: "", // honeypot
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (res.ok && json.ok) {
        setState("done")
      } else {
        setState("error")
        setMessage(json.error || "Something went wrong. Try again.")
      }
    } catch {
      setState("error")
      setMessage("Network problem. Try again.")
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-[var(--mocha)]/30 bg-[var(--mocha-wash)] p-6">
        <div className="text-[16px] font-semibold text-[var(--ink)]">You're opted in.</div>
        <p className="mt-2 text-[14px] text-[var(--ink-soft)] leading-relaxed">
          Patrick will follow up by text. Reply STOP to any message if you
          change your mind.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--rule-strong)] bg-[var(--paper-raised)] p-6 space-y-4"
    >
      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)] mb-1.5">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-xl border border-[var(--rule-strong)] bg-[var(--paper)] px-3.5 py-2.5 text-[15px] text-[var(--ink)] focus:border-[var(--mocha)] focus:outline-none"
          placeholder="First and last name"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)] mb-1.5">
          Mobile number
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          inputMode="tel"
          className="w-full rounded-xl border border-[var(--rule-strong)] bg-[var(--paper)] px-3.5 py-2.5 text-[15px] text-[var(--ink)] focus:border-[var(--mocha)] focus:outline-none"
          placeholder="(615) 555-1234"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)] mb-1.5">
          Property address (optional)
        </label>
        <input
          value={property}
          onChange={(e) => setProperty(e.target.value)}
          className="w-full rounded-xl border border-[var(--rule-strong)] bg-[var(--paper)] px-3.5 py-2.5 text-[15px] text-[var(--ink)] focus:border-[var(--mocha)] focus:outline-none"
          placeholder="Street, city"
        />
      </div>
      {/* Honeypot — hidden from humans */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-1 h-4 w-4 accent-[var(--mocha)]"
        />
        <span className="text-[13px] leading-[1.6] text-[var(--ink-soft)]">{CONSENT_TEXT}</span>
      </label>
      <button
        type="submit"
        disabled={state === "busy" || !consent}
        className="w-full rounded-xl border border-[var(--mocha)] bg-[var(--mocha)] hover:bg-[var(--mocha-deep)] px-4 py-3 text-[15px] font-semibold text-white transition-colors disabled:opacity-50"
      >
        {state === "busy" ? "Submitting..." : "Opt in to text messages"}
      </button>
      {message && <div className="text-[13px] text-amber-300/90">{message}</div>}
    </form>
  )
}
