"use client"

/**
 * AI compose panel — invoked from lead-detail's "AI compose" button.
 *
 * Three modes:
 *   - opener: cold first-touch, bot picks an angle
 *   - followup: bot rotates to a different angle than prior outbound
 *   - reply: Patrick pastes the inbound message, bot drafts a response
 *
 * UX flow:
 *   1. Patrick clicks "AI compose" → panel opens with mode selector
 *   2. (Reply mode only) paste inbound text
 *   3. Click "Generate draft"
 *   4. Panel shows: draft text (editable), angle used, confidence,
 *      rationale, suggested next step
 *   5. Buttons:
 *      - "Send via iMessage" (opens sms: URL with body pre-filled)
 *      - "Log this send" (records to dialer_activities for the
 *        learning loop — only call once Patrick has actually sent)
 *      - "Regenerate" (different angle / take another swing)
 *
 * Compliance UI:
 *   - If endpoint returns suggested_action='honor_optout', show a
 *     red banner and disable send buttons.
 *
 * Note: this component is self-contained — handles its own state,
 * fetching, and logging. Parent only needs to mount it with the slug.
 */

import { useState } from "react"

type ComposeResponse = {
  draft: string
  angle_used: string | null
  confidence: number
  suggested_action:
    | "send"
    | "edit_then_send"
    | "wait"
    | "escalate_to_patrick"
    | "honor_optout"
  rationale: string
  next_step_if_they_reply: string
  smsHref: string | null
  phone: string | null
}

type Mode = "opener" | "followup" | "reply"

export function AiComposePanel({
  slug,
  ownerName,
  caller,
  onClose,
}: {
  slug: string
  ownerName?: string | null
  caller: string
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>("opener")
  const [inbound, setInbound] = useState("")
  const [pastedThread, setPastedThread] = useState("")
  const [showPaste, setShowPaste] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComposeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editedDraft, setEditedDraft] = useState("")
  const [logging, setLogging] = useState(false)
  const [logged, setLogged] = useState(false)
  const [sendingTwilio, setSendingTwilio] = useState(false)
  const [twilioSent, setTwilioSent] = useState(false)

  async function generate() {
    setError(null)
    setResult(null)
    setLogged(false)
    setLoading(true)
    try {
      const body: {
        mode: Mode
        inbound_message?: string
        pasted_thread?: string
      } = { mode }
      if (mode === "reply") {
        if (!inbound.trim()) {
          setError("Paste the inbound message first.")
          setLoading(false)
          return
        }
        body.inbound_message = inbound.trim()
      }
      if (pastedThread.trim()) {
        body.pasted_thread = pastedThread.trim()
      }
      const res = await fetch(`/api/dialer/${slug}/ai-compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || `HTTP ${res.status}`)
        setLoading(false)
        return
      }
      setResult(json as ComposeResponse)
      setEditedDraft((json as ComposeResponse).draft || "")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function sendViaImessage() {
    if (!result || !editedDraft.trim()) return
    if (!result.phone) {
      setError("No phone number on file for this lead.")
      return
    }
    // Build sms: href with the (possibly edited) draft text.
    const href = `sms:${result.phone}?&body=${encodeURIComponent(editedDraft.trim())}`
    window.location.href = href
  }

  async function sendViaTwilio() {
    if (!result || !editedDraft.trim() || !result.phone) return
    setSendingTwilio(true)
    setError(null)
    try {
      const res = await fetch(`/api/sms/twilio-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          to_phone: result.phone,
          body: editedDraft.trim(),
          angle: result.angle_used || null,
        }),
      })
      const json = (await res.json()) as { error?: string; sid?: string }
      if (!res.ok) {
        setError(
          json.error ||
            `Twilio send failed: HTTP ${res.status}. Make sure TWILIO_FROM_NUMBER is set in Vercel env.`
        )
        return
      }
      setTwilioSent(true)
      // Inbound will land on the Twilio webhook → conversation continues.
    } catch (e) {
      setError("Twilio send failed: " + (e as Error).message)
    } finally {
      setSendingTwilio(false)
    }
  }

  async function logSend() {
    if (!result) return
    setLogging(true)
    try {
      // Log to dialer_activities. The angle gets into notes for now
      // (until we ship the ai_angle column migration).
      const angleTag = result.angle_used ? `[AI angle: ${result.angle_used}]\n` : ""
      const res = await fetch(`/api/dialer/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingSlug: slug,
          channel: "text",
          outcome: "note_only",
          notes: angleTag + editedDraft.trim(),
          createdBy: caller,
        }),
      })
      if (!res.ok) {
        setError("Logged failed: " + (await res.text()).slice(0, 200))
        return
      }
      setLogged(true)
    } catch (e) {
      setError("Log failed: " + (e as Error).message)
    } finally {
      setLogging(false)
    }
  }

  const isOptout = result?.suggested_action === "honor_optout"
  const isEscalate = result?.suggested_action === "escalate_to_patrick"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 md:p-6">
      <div className="w-full max-w-2xl rounded-xl border border-emerald-400/30 bg-[#0a0a0a] text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-emerald-400/[0.04]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/80 font-semibold">
              AI compose · FALCO sales brain
            </div>
            {ownerName && (
              <div className="text-[13px] text-white/60 mt-0.5">
                Drafting for {ownerName}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/55 hover:text-white text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Mode selector */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/55 mb-2 font-semibold">
              Mode
            </div>
            <div className="flex gap-2 flex-wrap">
              <ModeBtn
                active={mode === "opener"}
                onClick={() => {
                  setMode("opener")
                  setResult(null)
                  setLogged(false)
                }}
              >
                Cold opener
              </ModeBtn>
              <ModeBtn
                active={mode === "followup"}
                onClick={() => {
                  setMode("followup")
                  setResult(null)
                  setLogged(false)
                }}
              >
                Follow-up (no reply)
              </ModeBtn>
              <ModeBtn
                active={mode === "reply"}
                onClick={() => {
                  setMode("reply")
                  setResult(null)
                  setLogged(false)
                }}
              >
                Reply to their text
              </ModeBtn>
            </div>
          </div>

          {/* Reply mode: paste inbound */}
          {mode === "reply" && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55 mb-2 font-semibold">
                What did they send?
              </div>
              <textarea
                value={inbound}
                onChange={(e) => setInbound(e.target.value)}
                placeholder="Paste their text here verbatim..."
                rows={3}
                className="w-full rounded-md bg-white/[0.05] border border-white/15 px-3 py-2 text-[14px] text-white placeholder-white/35 focus:outline-none focus:border-emerald-400/50"
              />
            </div>
          )}

          {/* Optional: paste iMessage thread context.
              Patrick's outreach goes from his personal cell — replies come
              there too, so the brain has no DB record of the conversation.
              Screenshot the thread on iPhone, long-press text in the
              screenshot to copy, paste here. */}
          <div>
            {!showPaste ? (
              <button
                onClick={() => setShowPaste(true)}
                className="text-[12px] text-emerald-300/85 hover:text-emerald-200 underline-offset-2 hover:underline"
              >
                + paste iMessage thread context (optional)
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/55 font-semibold">
                    iMessage thread (optional)
                  </div>
                  <button
                    onClick={() => {
                      setShowPaste(false)
                      setPastedThread("")
                    }}
                    className="text-[10px] text-white/45 hover:text-white/70"
                  >
                    hide
                  </button>
                </div>
                <textarea
                  value={pastedThread}
                  onChange={(e) => setPastedThread(e.target.value)}
                  placeholder="Paste the thread from your iPhone iMessage screenshot. Brain uses it as ground truth for what's been said with this homeowner."
                  rows={4}
                  className="w-full rounded-md bg-white/[0.04] border border-white/15 px-3 py-2 text-[13px] text-white/85 placeholder-white/30 focus:outline-none focus:border-emerald-400/50 font-mono"
                />
                <div className="mt-1 text-[10px] text-white/40 leading-[1.5]">
                  Tip: screenshot the iMessage thread on iPhone → photo → long-press → Select All → Copy. Then paste here.
                </div>
              </>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={loading || (mode === "reply" && !inbound.trim())}
            className="w-full rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-[14px] py-2.5 transition-colors"
          >
            {loading
              ? "Thinking..."
              : result
              ? "↻ Generate another"
              : "✦ Generate draft"}
          </button>

          {error && (
            <div className="rounded-md border border-red-400/40 bg-red-400/10 text-red-200 text-[13px] px-3 py-2">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {isOptout && (
                <div className="rounded-md border border-red-400/50 bg-red-500/15 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-red-300 font-semibold">
                    Honor opt-out — do NOT send
                  </div>
                  <div className="text-[13px] text-red-100/80 mt-1">
                    {result.rationale}
                  </div>
                </div>
              )}
              {isEscalate && (
                <div className="rounded-md border border-amber-400/50 bg-amber-400/10 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-amber-200 font-semibold">
                    Escalate — handle this one manually
                  </div>
                  <div className="text-[13px] text-amber-100/80 mt-1">
                    {result.rationale}
                  </div>
                </div>
              )}

              {/* Editable draft */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/80 font-semibold">
                    Draft (edit if needed)
                  </div>
                  <div className="text-[10px] text-white/40 tabular-nums">
                    {editedDraft.length} chars
                  </div>
                </div>
                <textarea
                  value={editedDraft}
                  onChange={(e) => setEditedDraft(e.target.value)}
                  rows={5}
                  disabled={isOptout}
                  className="w-full rounded-md bg-white/[0.05] border border-emerald-400/30 px-3 py-2 text-[14px] text-white focus:outline-none focus:border-emerald-400/60 disabled:opacity-50"
                />
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[12px]">
                <Meta label="Angle">
                  {result.angle_used || "—"}
                </Meta>
                <Meta label="Confidence">
                  {(result.confidence * 100).toFixed(0)}%
                </Meta>
                <Meta label="Action">{result.suggested_action}</Meta>
              </div>

              <div className="text-[12px] text-white/55 leading-[1.55]">
                <span className="text-white/40">Why this draft:</span>{" "}
                {result.rationale}
              </div>
              {result.next_step_if_they_reply && (
                <div className="text-[12px] text-white/55 leading-[1.55]">
                  <span className="text-white/40">If they reply:</span>{" "}
                  {result.next_step_if_they_reply}
                </div>
              )}

              {/* Send + log buttons */}
              {!isOptout && (
                <div className="space-y-2 pt-1">
                  {/* Twilio send — fully automated, logs both ways,
                      goes from your FALCO number. The Send via Twilio
                      button is the future state. iMessage is the
                      transitional one. */}
                  <button
                    onClick={sendViaTwilio}
                    disabled={
                      sendingTwilio ||
                      twilioSent ||
                      !editedDraft.trim() ||
                      !result.phone
                    }
                    className="w-full rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-black font-semibold text-[14px] py-2.5 transition-colors"
                    title="Send via FALCO's Twilio number. Bot auto-logs the send, and inbound replies will route through our webhook so the brain sees everything."
                  >
                    {twilioSent
                      ? "✓ Sent via Twilio"
                      : sendingTwilio
                      ? "Sending..."
                      : "⚡ Send via Twilio (auto-logged)"}
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={sendViaImessage}
                      disabled={!editedDraft.trim() || !result.phone}
                      className="flex-1 min-w-[170px] rounded-md border border-white/20 hover:bg-white/[0.06] disabled:opacity-40 text-white text-[13px] py-2 transition-colors"
                      title="Legacy: opens iMessage on your cell. You'll have to log the send manually after."
                    >
                      📲 Send via iMessage (cell)
                    </button>
                    <button
                      onClick={logSend}
                      disabled={logging || logged || !editedDraft.trim()}
                      className="flex-1 min-w-[170px] rounded-md border border-white/20 hover:bg-white/[0.06] disabled:opacity-40 text-white/70 text-[13px] py-2 transition-colors"
                      title="Records to dialer_activities (use after sending via iMessage so the brain has context)."
                    >
                      {logged
                        ? "✓ Logged"
                        : logging
                        ? "Logging..."
                        : "📝 Log iMessage send"}
                    </button>
                  </div>
                </div>
              )}
              {!result.phone && (
                <div className="text-[11px] text-amber-300/80">
                  No phone on file — Send via iMessage won't work. Copy text manually if needed.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        active
          ? "bg-emerald-400/20 border border-emerald-400/50 text-emerald-100"
          : "bg-white/[0.03] border border-white/15 text-white/65 hover:bg-white/[0.07]"
      }`}
    >
      {children}
    </button>
  )
}

function Meta({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.18em] text-white/45 font-semibold">
        {label}
      </div>
      <div className="text-[12px] text-white/85 mt-0.5">{children}</div>
    </div>
  )
}
