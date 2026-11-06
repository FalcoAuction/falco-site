"use client"

import { useState } from "react"
import { Icon } from "./icons"

export type ThemePref = "light" | "dark" | "system"
const ORDER: ThemePref[] = ["system", "light", "dark"]
const LABEL: Record<ThemePref, string> = { system: "System theme", light: "Light theme", dark: "Dark theme" }
const ICON: Record<ThemePref, string> = { system: "monitor", light: "sun", dark: "moon" }

// The preference lives in a cookie so the server renders the right theme
// on the first paint (no flash). "system" removes data-theme and lets
// prefers-color-scheme decide.
export function ThemeToggle({ initial }: { initial: ThemePref }) {
  const [pref, setPref] = useState<ThemePref>(initial)
  function next() {
    const value = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length]
    setPref(value)
    const root = document.querySelector(".crm")
    if (value === "system") root?.removeAttribute("data-theme")
    else root?.setAttribute("data-theme", value)
    document.cookie = `crm_theme=${value}; path=/; max-age=31536000; samesite=lax`
  }
  return (
    <button type="button" className="crm-btn ghost" onClick={next} title={LABEL[pref]} aria-label={LABEL[pref]}>
      <Icon name={ICON[pref]} />
      <span>{pref === "system" ? "System" : pref === "light" ? "Light" : "Dark"}</span>
    </button>
  )
}
