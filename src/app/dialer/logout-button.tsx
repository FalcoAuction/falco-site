"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

export default function LogoutButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch("/api/dialer/logout", { method: "POST" })
          router.push("/dialer/login")
          router.refresh()
        })
      }
      className="rounded-md border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-[11px] uppercase tracking-wider text-white/75 transition-colors"
    >
      {pending ? "…" : "Sign out"}
    </button>
  )
}
