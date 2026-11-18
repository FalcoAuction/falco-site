"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Foot, Nav } from "../v2/v2-content"
import { ASSET_CLASSES, SITUATIONS } from "../v2/situations"
import { SMS_CONSENT_TEXT, recordSmsConsent } from "@/lib/sms-consent"

export const ROLES = [
  { id: "owner", label: "Owner or family" },
  { id: "executor", label: "Executor or administrator" },
  { id: "professional", label: "Attorney or advisor" },
  { id: "agent", label: "Real estate agent" },
  { id: "trustee", label: "Trustee or receiver" },
  { id: "lienholder", label: "Lienholder" },
  { id: "other", label: "Something else" },
]

const OTHER = { slug: "other", label: "Something else" }
const STEPS = 6

/**
 * One intake for every situation, one question per screen. Posts to the
 * homeowner intake (/api/homeowners/request), so every submission lands in
 * the CRM as a lead with the address, sale date and payoff the math sheet
 * needs; situation, role and assets ride in situation_notes.
 * ?s=<situation>&r=<role> preselect.
 */
export default function StartForm({ s, r }: { s?: string; r?: string }) {
  const presetSituation =
    s && (SITUATIONS.some((x) => x.slug === s) || s === OTHER.slug) ? s : ""
  const [step, setStep] = useState(presetSituation ? 1 : 0)
  const [situation, setSituation] = useState(presetSituation)
  const [role, setRole] = useState(r && ROLES.some((x) => x.id === r) ? r : "")
  const [assets, setAssets] = useState<string[]>([])
  const [county, setCounty] = useState("")
  const [address, setAddress] = useState("")
  const [saleDate, setSaleDate] = useState("")
  const [owed, setOwed] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [optIn, setOptIn] = useState(false)
  const [optInNote, setOptInNote] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const next = () => setStep((n) => Math.min(n + 1, STEPS - 1))
  const back = () => setStep((n) => Math.max(n - 1, 0))
  const toggleAsset = (h: string) =>
    setAssets((cur) => (cur.includes(h) ? cur.filter((a) => a !== h) : [...cur, h]))

  const sitLabel =
    SITUATIONS.find((x) => x.slug === situation)?.label ?? (situation ? OTHER.label : "")
  const roleLabel = ROLES.find((x) => x.id === role)?.label ?? ""

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (optIn && phone.replace(/[^0-9]/g, "").length < 10) {
      setError("Add a mobile number to get texts, or uncheck the text box.")
      return
    }
    const message = [
      `Situation: ${sitLabel || "(not given)"}`,
      roleLabel && `I am: ${roleLabel}`,
      assets.length > 0 && `Needs to sell: ${assets.join(", ")}`,
      "",
      notes || "(no notes)",
    ]
      .filter((l) => l !== false && l !== "")
      .join("\n")
    start(async () => {
      const res = await fetch("/api/homeowners/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          propertyAddress: address.trim(),
          county: county.trim(),
          trusteeSaleDate: saleDate || null,
          mortgageBalance: owed.trim() || null,
          bestCallback: "",
          situationNotes: message,
          referrer: `start:${situation || "unspecified"}`,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.error ?? "Something went wrong. Try again or email help@falco.llc.")
        return
      }
      // Recorded separately; a failure here never undoes the request.
      if (optIn) {
        const consentErr = await recordSmsConsent({ name: fullName.trim(), phone: phone.trim() })
        setOptInNote(consentErr ? "Your text opt-in didn't save. We'll stick to email." : null)
      }
      setDone(true)
    })
  }

  // The bar never starts empty, and only reaches 100% once it's sent.
  const progress = done ? 100 : Math.round(((step + 1) / (STEPS + 1)) * 100)

  return (
    <>
      <Nav />
      <main id="main" className="st">
        <div className="st-wrap">
          <div className="st-top">
            <div
              className="st-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className="st-meta">
              {step > 0 && !done ? (
                <button type="button" className="st-back" onClick={back}>
                  ← Back
                </button>
              ) : (
                <span />
              )}
              <span>{done ? "Done" : `${step + 1} of ${STEPS}`}</span>
            </div>
          </div>

          <div className="st-step" key={done ? "done" : step}>
            {done ? (
              <>
                <h1 className="st-q">Thank you. We&apos;ve got it.</h1>
                <p className="st-sub">
                  We&apos;ll send your numbers within one business day: what it
                  would likely clear and who would sell it. Nothing is owed either way.
                </p>
                {optInNote && <p className="st-sub">{optInNote}</p>}
                <Link className="pill line" href="/">
                  Back to home
                </Link>
              </>
            ) : step === 0 ? (
              <>
                <h1 className="st-q">What happened?</h1>
                <p className="st-sub">Pick the one closest to yours.</p>
                <div className="st-opts">
                  {[...SITUATIONS, OTHER].map((x) => (
                    <button
                      key={x.slug}
                      type="button"
                      className="st-opt"
                      aria-pressed={situation === x.slug}
                      onClick={() => {
                        setSituation(x.slug)
                        next()
                      }}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </>
            ) : step === 1 ? (
              <>
                <h1 className="st-q">What needs to sell?</h1>
                <p className="st-sub">Pick all that apply. Not sure is fine.</p>
                <div className="st-opts two">
                  {ASSET_CLASSES.map((a) => (
                    <button
                      key={a.h}
                      type="button"
                      className="st-opt"
                      aria-pressed={assets.includes(a.h)}
                      onClick={() => toggleAsset(a.h)}
                    >
                      {a.h}
                    </button>
                  ))}
                </div>
                <div className="st-go">
                  <button type="button" className="pill dark" onClick={next}>
                    {assets.length ? "Next" : "Skip"} <sub>→</sub>
                  </button>
                </div>
              </>
            ) : step === 2 ? (
              <>
                <h1 className="st-q">Who are you in this?</h1>
                <div className="st-opts">
                  {ROLES.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className="st-opt"
                      aria-pressed={role === x.id}
                      onClick={() => {
                        setRole(x.id)
                        next()
                      }}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </>
            ) : step === 3 ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  next()
                }}
              >
                <h1 className="st-q">Where is it?</h1>
                <p className="st-sub">
                  The property address. If it isn&apos;t a property, the city is enough.
                </p>
                <input
                  className="st-in"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Nashville, TN 37206"
                  aria-label="Address or city"
                  autoComplete="street-address"
                  autoFocus
                />
                <input
                  className="st-in"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="County (optional)"
                  aria-label="County"
                />
                <div className="st-go">
                  <button type="submit" className="pill dark">
                    Next <sub>→</sub>
                  </button>
                </div>
              </form>
            ) : step === 4 ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  next()
                }}
              >
                <h1 className="st-q">The numbers you know.</h1>
                <p className="st-sub">Leave anything you&apos;re not sure of blank.</p>
                <label className="pg-label" htmlFor="stSale">Sale date, if there is one</label>
                <input
                  id="stSale"
                  className="st-in"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
                <label className="pg-label" htmlFor="stOwed">Roughly what&apos;s owed on it</label>
                <input
                  id="stOwed"
                  className="st-in"
                  inputMode="numeric"
                  value={owed}
                  onChange={(e) => setOwed(e.target.value)}
                  placeholder="e.g. 220000"
                />
                <div className="st-go">
                  <button type="submit" className="pill dark">
                    {saleDate || owed.trim() ? "Next" : "Skip"} <sub>→</sub>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={submit}>
                <h1 className="st-q">How do we reach you?</h1>
                <p className="st-sub">We only use this to get back to you.</p>
                <input
                  className="st-in"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  aria-label="Your name"
                  autoComplete="name"
                  autoFocus
                />
                <input
                  className="st-in"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  aria-label="Email"
                  autoComplete="email"
                />
                <input
                  className="st-in"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  aria-label="Phone"
                  autoComplete="tel"
                />
                <textarea
                  className="st-in"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything else? Who's involved, what you've tried. (optional)"
                  aria-label="Anything else"
                />
                {/* Optional SMS opt-in: unchecked and never required (A2P 10DLC). */}
                <label className="st-check st-optin">
                  <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
                  <span>
                    {SMS_CONSENT_TEXT.replace(" Privacy policy: falco.llc/privacy.", "")}{" "}
                    <Link href="/privacy">Privacy policy</Link>. Optional.
                  </span>
                </label>
                {error && <div className="warn">{error}</div>}
                <div className="st-go">
                  <button type="submit" className="pill dark" disabled={pending}>
                    {pending ? "Sending..." : "Send"} <sub>→</sub>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      <Foot />
    </>
  )
}
