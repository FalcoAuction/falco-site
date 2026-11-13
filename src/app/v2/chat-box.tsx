"use client"

import { useEffect, useRef, useState } from "react"

type Turn = { role: "user" | "assistant"; content: string }

const GREETING = "What do you need sold, or what are you looking for?"
const STARTERS = [
  "Settling an estate",
  "A house with a sale date",
  "Closing a business",
  "Vehicles or equipment",
  "I'm looking to buy",
]
const MAX_CHARS = 1000

type Props = {
  mode?: "intake" | "faq"
  greeting?: string
  starters?: string[]
  placeholder?: string
  inputId?: string
}

/** Homepage assistant. Sends the running conversation to /api/chat. */
export default function ChatBox({
  mode = "intake",
  greeting = GREETING,
  starters = STARTERS,
  placeholder = "Tell us what has to sell, or what you want to buy",
  inputId = "cbInput",
}: Props) {
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", content: greeting },
  ])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leadSaved, setLeadSaved] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  // Scroll the log itself, never the page around it.
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, pending])

  async function send(raw: string) {
    const text = raw.trim()
    if (!text || pending) return
    const next: Turn[] = [...turns, { role: "user", content: text }]
    setTurns(next)
    setDraft("")
    setError(null)
    setPending(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, leadSaved, mode }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.reply) {
        setError(body?.error ?? "That didn't go through. Try again or email falco@falco.llc.")
        return
      }
      setTurns((cur) => [...cur, { role: "assistant", content: body.reply }])
      if (body.leadSaved) setLeadSaved(true)
    } catch {
      setError("That didn't go through. Try again or email falco@falco.llc.")
    } finally {
      setPending(false)
    }
  }

  const started = turns.length > 1

  return (
    <div className="cb-chat">
      <div className="cb-log" ref={logRef} role="log" aria-live="polite">
        {turns.map((t, i) => (
          <p
            key={i}
            className={t.role === "user" ? "cb-msg me" : i === 0 ? "cb-msg first" : "cb-msg"}
          >
            {t.content}
          </p>
        ))}
        {pending && <p className="cb-msg dim">Thinking...</p>}
      </div>
      {!started && (
        <div className="cb-starters">
          {starters.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {error && <p className="cb-err">{error}</p>}
      <form
        className="cb-input"
        onSubmit={(e) => {
          e.preventDefault()
          send(draft)
        }}
      >
        <label className="skip" htmlFor={inputId}>
          Your message
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_CHARS}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button className="pill dark" type="submit" disabled={pending || !draft.trim()}>
          Send <sub>→</sub>
        </button>
      </form>
      <p className="xs cb-note">
        AI assistant. Not legal or financial advice. Licensed Tennessee firms
        run every sale.
      </p>
    </div>
  )
}
