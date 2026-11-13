"use client"

import Link from "next/link"
import { useState } from "react"

/**
 * One question per screen with a progress bar, the same flow as /start.
 * Every public form on the site is built from this so they all feel the
 * same: tap an answer and it moves on, optional screens say Skip, and the
 * last screen sends.
 */

export type StepField = {
  name: string
  label: string
  type?: "text" | "email" | "tel" | "date" | "textarea"
  placeholder?: string
  required?: boolean
  hint?: string
  autoComplete?: string
  inputMode?: "numeric" | "tel" | "email" | "text"
}

export type Step =
  | { kind: "fields"; q: string; sub?: string; fields: StepField[] }
  | { kind: "choice"; q: string; sub?: string; name: string; options: string[]; multi?: boolean }
  | { kind: "check"; q: string; sub?: string; name: string; text: string }

export type StepValues = Record<string, string | string[] | boolean>

export default function StepForm({
  label,
  steps,
  initial = {},
  submitLabel = "Send",
  onSubmit,
  done,
}: {
  label?: string
  steps: Step[]
  initial?: StepValues
  submitLabel?: string
  /** Returns an error message to show, or null when it went through. */
  onSubmit: (values: StepValues) => Promise<string | null>
  done: { title: string; text: string }
}) {
  const [i, setI] = useState(0)
  const [values, setValues] = useState<StepValues>(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [finished, setFinished] = useState(false)

  const n = steps.length
  const last = i === n - 1
  const step = steps[i]
  const str = (k: string) => (typeof values[k] === "string" ? (values[k] as string) : "")
  const list = (k: string) => (Array.isArray(values[k]) ? (values[k] as string[]) : [])
  const set = (k: string, v: string | string[] | boolean) => setValues((cur) => ({ ...cur, [k]: v }))
  const next = () => setI((x) => Math.min(x + 1, n - 1))
  const back = () => setI((x) => Math.max(x - 1, 0))

  async function advance(e?: React.FormEvent) {
    e?.preventDefault()
    if (!last) {
      next()
      return
    }
    setError(null)
    setPending(true)
    try {
      const err = await onSubmit(values)
      if (err) setError(err)
      else setFinished(true)
    } catch {
      setError("Something went wrong. Try again or email help@falco.llc.")
    } finally {
      setPending(false)
    }
  }

  // The bar never starts empty, and only fills once it's sent.
  const progress = finished ? 100 : Math.round(((i + 1) / (n + 1)) * 100)
  const answered =
    step.kind === "fields"
      ? step.fields.some((f) => str(f.name).trim())
      : step.kind === "choice"
        ? step.multi
          ? list(step.name).length > 0
          : Boolean(str(step.name))
        : values[step.name] === true

  const required = step.kind === "fields" && step.fields.some((f) => f.required)
  const goLabel = last ? (pending ? "Sending..." : submitLabel) : answered || required ? "Next" : "Skip"

  return (
    <div className="stf">
      <div className="st-top">
        {label && <p className="st-label">{label}</p>}
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
          {i > 0 && !finished ? (
            <button type="button" className="st-back" onClick={back}>
              ← Back
            </button>
          ) : (
            <span />
          )}
          <span>{finished ? "Done" : `${i + 1} of ${n}`}</span>
        </div>
      </div>

      <div className="st-step" key={finished ? "done" : i}>
        {finished ? (
          <>
            <h2 className="st-q">{done.title}</h2>
            <p className="st-sub">{done.text}</p>
            <Link className="pill line" href="/">
              Back to home
            </Link>
          </>
        ) : (
          <form onSubmit={advance}>
            <h2 className="st-q">{step.q}</h2>
            {step.sub && <p className="st-sub">{step.sub}</p>}

            {step.kind === "fields" &&
              step.fields.map((f, k) => (
                <div key={f.name} className="st-field">
                  {step.fields.length > 1 && (
                    <label className="pg-label" htmlFor={`stf-${f.name}`}>
                      {f.label}
                      {f.required && <em>*</em>}
                    </label>
                  )}
                  {f.type === "textarea" ? (
                    <textarea
                      id={`stf-${f.name}`}
                      className="st-in"
                      rows={4}
                      required={f.required}
                      value={str(f.name)}
                      onChange={(e) => set(f.name, e.target.value)}
                      placeholder={f.placeholder}
                      aria-label={f.label}
                      autoFocus={k === 0}
                    />
                  ) : (
                    <input
                      id={`stf-${f.name}`}
                      className="st-in"
                      type={f.type ?? "text"}
                      required={f.required}
                      value={str(f.name)}
                      onChange={(e) => set(f.name, e.target.value)}
                      placeholder={f.placeholder}
                      aria-label={f.label}
                      autoComplete={f.autoComplete}
                      inputMode={f.inputMode}
                      autoFocus={k === 0}
                    />
                  )}
                  {f.hint && <p className="pg-hint">{f.hint}</p>}
                </div>
              ))}

            {step.kind === "choice" && (
              <div className={`st-opts${step.options.length > 5 ? " two" : ""}`}>
                {step.options.map((o) => {
                  const on = step.multi ? list(step.name).includes(o) : str(step.name) === o
                  return (
                    <button
                      key={o}
                      type="button"
                      className="st-opt"
                      aria-pressed={on}
                      onClick={() => {
                        if (step.multi) {
                          const cur = list(step.name)
                          set(step.name, on ? cur.filter((x) => x !== o) : [...cur, o])
                        } else {
                          set(step.name, o)
                          if (!last) next()
                        }
                      }}
                    >
                      {o}
                    </button>
                  )
                })}
              </div>
            )}

            {step.kind === "check" && (
              <label className="st-check">
                <input
                  type="checkbox"
                  required
                  checked={values[step.name] === true}
                  onChange={(e) => set(step.name, e.target.checked)}
                />
                <span>{step.text}</span>
              </label>
            )}

            {error && <div className="warn">{error}</div>}

            {/* A single-choice screen moves on by itself, so it only needs a
                button when it can be skipped or is the last screen. */}
            {(step.kind !== "choice" || step.multi || last || !answered) && (
              <div className="st-go">
                <button
                  type="submit"
                  className="pill dark"
                  disabled={pending || (step.kind === "check" && values[step.name] !== true)}
                >
                  {goLabel} <sub>→</sub>
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

/** Reads a JSON API response and returns its error text, or null on success. */
export async function postJson(url: string, body: unknown, fallbackError: string): Promise<string | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
  if (!res.ok || json?.ok === false) return json?.error ?? fallbackError
  return null
}
