"use client"

import { useReveals } from "../v2/v2-content"

// Runs the shared reveal-on-scroll hook for server-rendered guide pages.
export default function GuideReveals() {
  useReveals()
  return null
}
