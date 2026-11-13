"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Foot, Nav } from "../v2/v2-content"
import { ASSET_CLASSES, SITUATIONS } from "../v2/situations"

const ROLES = [
  { id: "owner", label: "Owner or family" },
  { id: "executor", label: "Executor or administrator" },
  { id: "professional", label: "Attorney or advisor" },
  { id: "trustee", label: "Trustee or receiver" },
  { id: "lienholder", label: "Lienholder" },
  { id: "other", label: "Something else" },
]

const OTHER = { slug: "other", label: "Something else" }
const STEPS = 5

/**
 * One intake for every situation, one question per screen. Posts to the
 * existing /api/inquiry (general_inquiries), so it needs no new table:
 * the answers ride in topic and message. ?s=<situation>&r=<role> preselect.
 */
export default function StartForm({ s, r }: { s?: string; r?: string }) {
  const presetSituation =
    s && (SITUATIONS.some((x) => x.slug === s) || s === OTHER.slug) ? s : ""
  const [step, setStep] = useState(presetSituation ? 1 : 0)
  const [situation, setSituation] = useState(presetSituation)
  const [role, setRole] = useState(r && ROLES.some((x) => x.id === r) ? r : "")
  const [assets, setAssets] = useState<string[]>([])
  const [county, setCounty] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
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
    const message = [
      `Situation: ${sitLabel || "(not given)"}`,
      roleLabel && `I am: ${roleLabel}`,
      assets.length > 0 && `Needs to sell: ${assets.join(", ")}`,
      county && `County: ${county}`,
      "",
      notes || "(no notes)",
    ]
      .filter((l) => l !== false && l !== "")
      .join("\n")
    start(async () => {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          company: "",
          topic: `Start: ${sitLabel || "unspecified"}${roleLabel ? ` / ${roleLabel}` : ""}`,
          message,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.error ?? "Something went wrong. Try again or email help@falco.llc.")
        return
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
                  We&apos;ll get back to you within one business day with what we
                  see. Nothing is owed either way.
                </p>
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
                <p className="st-sub">The Tennessee county is enough.</p>
                <input
                  className="st-in"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="Davidson, Wilson, Knox..."
                  aria-label="County"
                  autoFocus
                />
                <div className="st-go">
                  <button type="submit" className="pill dark">
                    {county.trim() ? "Next" : "Skip"} <sub>→</sub>
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
                  placeholder="Anything else? Dates, what's owed, who's involved. (optional)"
                  aria-label="Anything else"
                />
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
