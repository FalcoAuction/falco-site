"use client"

import { useRouter } from "next/navigation"

// A table row that opens its record. Cmd/Ctrl-click opens a new tab.
export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <tr
      tabIndex={0}
      onClick={(e) => (e.metaKey || e.ctrlKey ? window.open(href, "_blank") : router.push(href))}
      onKeyDown={(e) => { if (e.key === "Enter") router.push(href) }}
    >
      {children}
    </tr>
  )
}
