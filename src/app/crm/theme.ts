import { cookies } from "next/headers"

export type ThemePref = "light" | "dark" | "system"

/** Theme from the crm_theme cookie; "system" follows prefers-color-scheme. */
export async function readTheme(): Promise<ThemePref> {
  const raw = (await cookies()).get("crm_theme")?.value
  return raw === "light" || raw === "dark" ? raw : "system"
}

export const themeAttr = (t: ThemePref) => (t === "system" ? undefined : t)
