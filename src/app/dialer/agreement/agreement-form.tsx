"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export default function AgreementForm({
  callerName,
  email,
  nextPath,
}: {
  callerName: string
  email: string
  nextPath: string
}) {
  const router = useRouter()
  const [agreedNda, setAgreedNda] = useState(false)
  const [agreedNoncirc, setAgreedNoncirc] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const ready = agreedNda && agreedNoncirc

  function submit() {
    if (!ready) return
    setError(null)
    start(async () => {
      const res = await fetch("/api/dialer/agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caller: callerName, email }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(body?.error ?? "Failed to record acceptance.")
        return
      }
      router.push(nextPath || "/dialer")
      router.refresh()
    })
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreedNda}
          onChange={(e) => setAgreedNda(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-emerald-400"
        />
        <span className="text-sm text-white/85">
          I have read and agree to the <strong>Confidentiality (NDA)</strong> terms.
        </span>
      </label>
      <label className="mt-3 flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreedNoncirc}
          onChange={(e) => setAgreedNoncirc(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-emerald-400"
        />
        <span className="text-sm text-white/85">
          I have read and agree to the <strong>Non-Circumvention</strong> terms.
        </span>
      </label>

      <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="text-[11px] text-white/45">
          Signing as <span className="text-white">{callerName}</span> · {email || "no email"}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!ready || pending}
          className="rounded-md bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm px-5 py-2 transition-colors"
        >
          {pending ? "Recording…" : "I Agree — Continue"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
    </div>
  )
}
