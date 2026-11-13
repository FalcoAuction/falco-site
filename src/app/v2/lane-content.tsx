"use client"

import Link from "next/link"
import { Ledger } from "./v2-content"
import { PageHead, PageSec, SitePage } from "./site-page"
import { SITUATIONS, SITUATION_BY_SLUG } from "./situations"

/**
 * One template for every /situations/[slug] page. People arrive from the
 * footer, from a guide's "How FALCO handles..." link, or from search, so
 * each page answers the practical question (what FALCO does about this,
 * what it costs, what happens next) and points back to the guide for the
 * legal detail. Same building blocks as the rest of the site.
 */
export default function LaneContent({ slug }: { slug: string }) {
  const s = SITUATION_BY_SLUG[slug]
  const others = SITUATIONS.filter((o) => o.slug !== slug)

  return (
    <SitePage>
      <PageHead
        crumbs={[{ href: "/", label: "Home" }, { label: s.label }]}
        label="How FALCO helps"
        title={s.h1}
        lede={s.lede}
      >
        <Link className="pill dark" href={s.cta.href}>
          {s.cta.label} <sub>→</sub>
        </Link>
        <Link className="pill line" href="/#ask">
          Ask a question
        </Link>
      </PageHead>

      <PageSec
        label="Is this you?"
        title="Who we help here."
        note={`We usually hear about these from ${s.found
          .map((f) => f.charAt(0).toLowerCase() + f.slice(1))
          .join(", ")
          .replace(/, ([^,]*)$/, ", or $1")}.`}
      >
        <ul className="rows r">
          {s.who.map((w) => (
            <li key={w}>
              <b>{w}</b>
            </li>
          ))}
        </ul>
      </PageSec>

      <PageSec label="What gets sold" title="What we can route.">
        <ul className="rows r">
          {s.assets.map((a) => (
            <li key={a}>
              <b>{a}</b>
            </li>
          ))}
        </ul>
      </PageSec>

      {s.ledger && <Ledger full={false} />}

      <PageSec
        id="how"
        label="How it works"
        title="Three steps."
        note="Stop after any one of them. Nothing is owed either way."
      >
        <div className="quiet-steps" data-stagger="90">
          {s.steps.map((st, i) => (
            <div className="r" key={st.h}>
              <span className="n">Step {String(i + 1).padStart(2, "0")}</span>
              <h3 className="d3">{st.h}</h3>
              <p>{st.p}</p>
            </div>
          ))}
        </div>
      </PageSec>

      <PageSec label="What it costs" title="Nothing to you.">
        <ul className="rows r">
          <li>
            <b>No listing fee and no commission from your side.</b>
          </li>
          <li>
            <b>The buyer pays a 10% premium on top of the winning bid.</b>
            <span>That is how the auction firm and FALCO are paid.</span>
          </li>
          <li>
            <b>If it doesn&apos;t sell, you owe nobody anything.</b>
          </li>
        </ul>
      </PageSec>

      <PageSec label="Straight talk" title="What you should know.">
        <ul className="rows r">
          {s.straight.map((t) => (
            <li key={t.h}>
              <b>{t.h}</b>
              <span>{t.p}</span>
            </li>
          ))}
        </ul>
      </PageSec>

      <PageSec id="faq" label="Common questions" title="Straight answers.">
        <div className="faq r">
          {s.faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </PageSec>

      <PageSec label="Next step" title="Ready when you are." note="Free, and nothing is owed either way.">
        <div className="pills r">
          <Link className="pill dark" href={s.cta.href}>
            {s.cta.label} <sub>→</sub>
          </Link>
          <Link className="pill line" href={s.guide.href}>
            Read the guide: {s.guide.label}
          </Link>
        </div>
        <p className="lbl r" style={{ marginTop: "clamp(48px,6vw,80px)" }}>
          Not quite your situation?
        </p>
        <ul className="rows r">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/situations/${o.slug}`}>
                <b>{o.label}</b>
                <span>{o.short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </PageSec>
    </SitePage>
  )
}
