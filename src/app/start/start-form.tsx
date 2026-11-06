"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Foot, Nav, useReveals } from "../v2/v2-content"
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

/**
 * One intake for every situation. Posts to the existing /api/inquiry
 * (general_inquiries) so it needs no new table: the situation, role and
 * assets ride in topic and message. ?s=<situation>&r=<role> preselect.
 */
export default function StartForm({ s, r }: { s?: string; r?: string }) {
  useReveals()
  const [situation, setSituation] = useState(
    s && (SITUATIONS.some((x) => x.slug === s) || s === OTHER.slug) ? s : ""
  )
  const [role, setRole] = useState(r && ROLES.some((x) => x.id === r) ? r : "")
  const [assets, setAssets] = useState<string[]>([])
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [county, setCounty] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const toggleAsset = (h: string) =>
    setAssets((cur) => (cur.includes(h) ? cur.filter((a) => a !== h) : [...cur, h]))

  const sitLabel =
    SITUATIONS.find((s) => s.slug === situation)?.label ?? (situation ? OTHER.label : "")
  const roleLabel = ROLES.find((r) => r.id === role)?.label ?? ""

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!situation) {
      setError("Pick the situation closest to yours.")
      return
    }
    const message = [
      `Situation: ${sitLabel}`,
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
          topic: `Start: ${sitLabel}${roleLabel ? ` / ${roleLabel}` : ""}`,
          message,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.error ?? "Something went wrong. Try again or email falco@falco.llc.")
        return
      }
      setDone("Got it. We'll get back to you within one business day with what we see.")
    })
  }

  return (
    <>
      <Nav />
      <main id="main">
        <section className="sec" style={{ paddingTop: 24 }}>
          <div className="wrap">
            <div className="head">
              <div data-stagger="80">
                <p className="crumbs r">
                  <Link href="/">Home</Link> / Start here
                </p>
                <h1 className="d1 r">Tell us what happened.</h1>
              </div>
              <p className="lede note r">
                Two minutes. We&apos;ll come back within one business day with
                what is worth auctioning, who would sell it and what it would
                likely clear. Free, and nothing is owed either way.
              </p>
            </div>

            <div className="formcard r" style={{ maxWidth: 880 }}>
              {done ? (
                <div>
                  <h2 className="d3" style={{ marginBottom: 12 }}>Thank you.</h2>
                  <p className="lede">{done}</p>
                  <p style={{ marginTop: 20 }}>
                    <Link className="pill line" href="/">
                      Back to home
                    </Link>
                  </p>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="qblock">
                    <p className="qnum"><b>01</b><span>What happened?</span></p>
                    <div className="chips big">
                      {[...SITUATIONS, OTHER].map((s) => (
                        <button
                          key={s.slug}
                          type="button"
                          className="chip"
                          aria-pressed={situation === s.slug}
                          onClick={() => setSituation(s.slug)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="qblock">
                    <p className="qnum"><b>02</b><span>What needs to sell?</span></p>
                    <p className="xs" style={{ margin: "-6px 0 12px" }}>Pick all that apply. Not sure is fine.</p>
                    <div className="chips big">
                      {ASSET_CLASSES.map((a) => (
                        <button
                          key={a.h}
                          type="button"
                          className="chip"
                          aria-pressed={assets.includes(a.h)}
                          onClick={() => toggleAsset(a.h)}
                        >
                          {a.h}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="qblock">
                    <p className="qnum"><b>03</b><span>Who are you in this?</span></p>
                    <div className="chips big">
                      {ROLES.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="chip"
                          aria-pressed={role === r.id}
                          onClick={() => setRole(r.id)}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="qnum"><b>04</b><span>How do we reach you?</span></p>
                  <div className="form">
                    <div className="f">
                      <label htmlFor="stName">Your name</label>
                      <input id="stName" required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                    </div>
                    <div className="f">
                      <label htmlFor="stEmail">Email</label>
                      <input id="stEmail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <div className="f">
                      <label htmlFor="stPhone">Phone (optional)</label>
                      <input id="stPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
                    </div>
                    <div className="f">
                      <label htmlFor="stCounty">County</label>
                      <input id="stCounty" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Davidson, Wilson..." />
                    </div>
                    <div className="f full">
                      <label htmlFor="stNotes">Anything we should know?</label>
                      <textarea id="stNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dates, what's owed, who else is involved. Whatever you have." />
                    </div>
                  </div>

                  {error && <div className="warn">{error}</div>}

                  <div className="send">
                    <button className="pill dark" type="submit" disabled={pending}>
                      {pending ? "Sending..." : "Send"} <sub>→</sub>
                    </button>
                    <p className="xs" style={{ margin: 0, maxWidth: "52ch" }}>
                      We only use this to get back to you. Nothing is shared or
                      sold. Rather email? <a href="mailto:falco@falco.llc" style={{ textDecoration: "underline" }}>falco@falco.llc</a>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Foot />
    </>
  )
}
