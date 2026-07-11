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
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.07] p-6">
        <div className="text-[16px] font-semibold text-emerald-100">You're opted in.</div>
        <p className="mt-2 text-[14px] text-white/60 leading-relaxed">
          Patrick will follow up by text. Reply STOP to any message if you
          change your mind.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4"
    >
      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-white/50 mb-1.5">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[15px] text-white focus:border-emerald-400/50 focus:outline-none"
          placeholder="First and last name"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-white/50 mb-1.5">
          Mobile number
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          inputMode="tel"
          className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[15px] text-white focus:border-emerald-400/50 focus:outline-none"
          placeholder="(615) 555-1234"
        />
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-white/50 mb-1.5">
          Property address (optional)
        </label>
        <input
          value={property}
          onChange={(e) => setProperty(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-[15px] text-white focus:border-emerald-400/50 focus:outline-none"
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
          className="mt-1 h-4 w-4 accent-emerald-400"
        />
        <span className="text-[13px] leading-[1.6] text-white/65">{CONSENT_TEXT}</span>
      </label>
      <button
        type="submit"
        disabled={state === "busy" || !consent}
        className="w-full rounded-xl border border-emerald-400/40 bg-emerald-400/15 hover:bg-emerald-400/25 px-4 py-3 text-[15px] font-semibold text-emerald-100 transition-colors disabled:opacity-50"
      >
        {state === "busy" ? "Submitting..." : "Opt in to text messages"}
      </button>
      {message && <div className="text-[13px] text-amber-300/90">{message}</div>}
    </form>
  )
}
