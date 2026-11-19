"use client"

import { Foot, Nav } from "../v2/v2-content"
import WhoRouter from "../v2/who-router"

/**
 * /start: one entry point for everyone. The first screen asks who the
 * person is, then shows the form built for them (sellers, professionals,
 * agents, auction firms, buyers, anyone else). ?s=<situation> carries the
 * situation into the seller and professional forms; ?r=<role> skips the
 * first screen.
 */
export default function StartForm({ s, r }: { s?: string; r?: string }) {
  return (
    <>
      <Nav />
      <main id="main" className="st">
        <div className="st-wrap">
          <WhoRouter situation={s} r={r} heading="h1" />
        </div>
      </main>
      <Foot />
    </>
  )
}
