"use client"

import { useEffect, useState } from "react"
import { Icon } from "./icons"
import type { ThemePref } from "./theme"

// One-click light/dark switch. Starts from the saved choice, or from the
// computer's setting when nothing is saved. The choice is kept in a cookie
// so the server renders the right theme on the first paint (no flash).
export function ThemeToggle({ initial }: { initial: ThemePref }) {
  const [dark, setDark] = useState(initial === "dark")
  useEffect(() => {
    if (initial === "system") setDark(window.matchMedia("(prefers-color-scheme: dark)").matches)
  }, [initial])
  function flip() {
    const next = dark ? "light" : "dark"
    setDark(!dark)
    document.querySelectorAll(".crm").forEach((el) => el.setAttribute("data-theme", next))
    document.cookie = `crm_theme=${next}; path=/; max-age=31536000; samesite=lax`
  }
  const label = dark ? "Switch to light mode" : "Switch to dark mode"
  return (
    <button type="button" className="crm-btn ghost" onClick={flip} title={label} aria-label={label} style={{ padding: "0 8px" }}>
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  )
}
