"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

type CountyOption = {
  value: string
  label: string
  count: number
}

type Props = {
  options: CountyOption[]
  selected: string
}

/**
 * County dropdown — narrows the queue to a single county. Empty
 * selection ("") means "all of selected region" (Middle TN by default).
 */
export function CountyFilter({ options, selected }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    const next = new URLSearchParams(params.toString())
    if (value) next.set("county", value)
    else next.delete("county")
    // Reset scroll-restore key so a fresh filter brings user to top.
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("dialer:queue:scroll")
    }
    startTransition(() => {
      router.push(`/dialer?${next.toString()}`, { scroll: true })
    })
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs text-white/60">
      <span className="uppercase tracking-wider">County</span>
      <select
        value={selected}
        onChange={onChange}
        disabled={isPending}
        className="rounded-md border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400/50 disabled:opacity-60"
      >
        <option value="">All Middle TN</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
    </label>
  )
}
