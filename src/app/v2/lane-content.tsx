"use client"

import Link from "next/link"
import { Ledger } from "./v2-content"
import IntakeForm from "./intake-form"
import { AnswersCue, PageHead, PageSec, SitePage, WhyAuctionLink } from "./site-page"
import { SITUATIONS, SITUATION_BY_SLUG } from "./situations"
import { GUIDE_GROUPS } from "../guides/guide-index"

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
  // Every guide filed under this situation on the /guides hub, so new
  // spokes show up here without touching this file.
  const guides =
    GUIDE_GROUPS.find((g) => g.situationHref === `/situations/${slug}`)?.guides ?? []

  return (
    <SitePage>
      <PageHead
        crumbs={[{ href: "/", label: "Home" }, { label: s.label }]}
        label="How FALCO helps"
        title={s.h1}
        lede={s.lede}
      >
        <a className="pill dark" href="#start">
          {s.cta.label} <sub>→</sub>
        </a>
        <a className="pill line" href="#faq">
          Common questions
        </a>
      </PageHead>

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

      <PageSec id="start" label="Get your numbers" title="Two minutes to start.">
        <div className="pg-form r">
          <IntakeForm situation={s.slug} />
        </div>
        <AnswersCue />
      </PageSec>

      <PageSec
        id="answers"
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
        note="Stop after any one of them."
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
        <WhyAuctionLink />
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

      {guides.length > 1 && (
        <PageSec label="Guides" title="The rules, in plain language.">
          <ul className="rows r">
            {guides.map((g) => (
              <li key={g.href}>
                <Link href={g.href}>
                  <b>{g.title}</b>
                  <span>{g.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </PageSec>
      )}

      <PageSec label="Not quite your situation?" title="Other ways we help.">
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
        <p className="r" style={{ marginTop: "clamp(40px,5vw,64px)" }}>
          <Link className="pill line" href={s.guide.href}>
            Read the guide: {s.guide.label} <sub>→</sub>
          </Link>
        </p>
      </PageSec>
    </SitePage>
  )
}
