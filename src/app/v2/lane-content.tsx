"use client"

import Link from "next/link"
import { Foot, Ledger, Nav, useReveals } from "./v2-content"
import { PageHead } from "./site-page"
import { SITUATIONS, SITUATION_BY_SLUG } from "./situations"

/**
 * One template for every /situations/[slug] page. Plain scrolling
 * sections (no sticky deck): these pages are read top to bottom by
 * someone deciding whether to call, so nothing should pin or cover.
 */
export default function LaneContent({ slug }: { slug: string }) {
  useReveals()
  const s = SITUATION_BY_SLUG[slug]
  const others = SITUATIONS.filter((o) => o.slug !== slug)
  return (
    <>
      <Nav />
      <main id="main" className="pg">
        <PageHead
          crumbs={[{ href: "/", label: "Home" }, { href: "/manifesto", label: "How it works" }, { label: s.label }]}
          title={s.h1}
          lede={s.lede}
        >
          <Link className="pill dark" href={s.cta.href}>
            {s.cta.label} <sub>→</sub>
          </Link>
          <a className="pill line" href="#how">
            How it works
          </a>
        </PageHead>

        <section className="pg-sec">
          <div className="wrap">
            <div className="lists" data-stagger="80">
              <div className="box r">
                <p className="lbl" style={{ margin: 0 }}>Who this is for</p>
                <ul>
                  {s.who.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
              <div className="box r">
                <p className="lbl" style={{ margin: 0 }}>What we can route</p>
                <ul>
                  {s.assets.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
              <div className="box r">
                <p className="lbl" style={{ margin: 0 }}>How we usually find it</p>
                <ul>
                  {s.found.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {s.ledger && <Ledger full={false} />}

        <section className="pg-sec" id="how">
          <div className="wrap">
            <div className="head">
              <div data-stagger="80">
                <p className="lbl r">How it works</p>
                <h2 className="d2 r">Three steps.</h2>
              </div>
              <p className="lede note r">
                Stop after any one of them. Nothing is owed either way.
              </p>
            </div>
            <div className="quiet-steps" data-stagger="90">
              {s.steps.map((st, i) => (
                <div className="r" key={st.h}>
                  <span className="n">Step {String(i + 1).padStart(2, "0")}</span>
                  <h3 className="d3">{st.h}</h3>
                  <p>{st.p}</p>
                </div>
              ))}
            </div>
            <p className="sm r" style={{ marginTop: 40 }}>
              Every sale is run by a licensed Tennessee firm with signed terms.
            </p>
          </div>
        </section>

        <section className="pg-sec">
          <div className="wrap">
            <div className="head">
              <div data-stagger="80">
                <p className="lbl r">Straight talk</p>
                <h2 className="d2 r">What you should know.</h2>
              </div>
            </div>
            <div className="lists" data-stagger="80">
              {s.straight.map((t) => (
                <div className="box r" key={t.h}>
                  <h4 style={{ marginTop: 0 }}>{t.h}</h4>
                  <p>{t.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pg-sec" id="faq">
          <div className="wrap">
            <div className="head">
              <div data-stagger="80">
                <p className="lbl r">Common questions</p>
                <h2 className="d2 r">Straight answers.</h2>
              </div>
            </div>
            <div className="faq r">
              {s.faq.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="pg-sec">
          <div className="wrap">
            <div className="r">
              <div className="head" style={{ marginBottom: 26 }}>
                <h2 className="d2">Not quite your situation?</h2>
                <p className="lede note">
                  Most sales start with one of these. If yours doesn&apos;t fit,
                  tell us anyway.
                </p>
              </div>
              <div className="others">
                {others.map((o) => (
                  <Link className="pill line" key={o.slug} href={`/situations/${o.slug}`}>
                    {o.label}
                  </Link>
                ))}
                <Link className="pill light" href="/start">
                  Something else <sub>→</sub>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Foot />
    </>
  )
}
