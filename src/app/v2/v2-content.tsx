"use client"

import Link from "next/link"
import { FAQ_ITEMS } from "./faq-items"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * Homepage, ported from the standalone static build into Next.js.
 *
 * Markup and class names match falco-design.css one-for-one so the design
 * is identical; the behaviours that were plain-JS on the static site are
 * reimplemented here as React:
 *   - .r  -> .in       reveal-on-scroll (data-stagger cascade)
 *   - data-count       count-up figures
 *   - data-src         lazy video (mobile gets the lighter cut)
 *   - the ledger       interactive three-exit calculator
 * Links point at real app routes instead of the static .html files.
 */

const CLOSING = 5000

const usd = (n: number) =>
  "$" + Math.round(Math.max(n, 0)).toLocaleString("en-US")

/* Reveal: adds .in to .r elements as they enter, cascading within a
   [data-stagger] group the way the static build did. */
function useReveals() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".r"))
    if (!els.length) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("in"))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const el = e.target as HTMLElement
          const group = el.closest<HTMLElement>("[data-stagger]")
          let delay = 0
          if (group) {
            const step = Number(group.dataset.stagger || 0)
            const sibs = Array.from(group.querySelectorAll(".r"))
            delay = sibs.indexOf(el) * step
          }
          window.setTimeout(() => el.classList.add("in"), delay)
          io.unobserve(el)
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* Count-up for the hero figures. */
function Count({ to, dur = 1100 }: { to: number; dur?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(to)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setN(0)
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur)
          setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to, dur])
  return <span ref={ref}>{n}</span>
}

/* Lazy video: mounts the source only near the viewport, and serves the
   lighter mobile cut on narrow screens. */
function LiteVideo({
  src,
  srcMob,
  poster,
  className,
}: {
  src: string
  srcMob?: string
  poster: string
  className?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [mounted, setMounted] = useState(false)
  const [chosen, setChosen] = useState(src)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const narrow = window.matchMedia("(max-width: 820px)").matches
    type Conn = { saveData?: boolean; effectiveType?: string }
    const c = (navigator as Navigator & { connection?: Conn }).connection
    if (c?.saveData || (c?.effectiveType && ["slow-2g", "2g"].includes(c.effectiveType))) return
    setChosen(narrow && srcMob ? srcMob : src)
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setMounted(true)
          io.disconnect()
        }
      },
      { rootMargin: "300px 0px" }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [src, srcMob])
  return (
    <video
      ref={ref}
      className={className}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    >
      {mounted && <source src={chosen} type="video/mp4" />}
    </video>
  )
}

export default function V2Content() {
  useReveals()
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <WhyWeExist />
        <ThreeWaysIn />
        <Ledger />
        <ThreeSteps />
        <Incentive />
        <Faq />
        <ClosingCta />
      </main>
      <Foot />
    </>
  )
}

function Nav() {
  const [stuck, setStuck] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // The mobile menu is a full-screen overlay, so lock the page behind it
  // and let Escape close it.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header className={`nav${stuck ? " stuck" : ""}`}>
      <Link className="brand" href="/" onClick={close}>
        FALCO
      </Link>
      <nav id="menu" className={open ? "open" : undefined}>
        <Link href="/homeowners" onClick={close}>Homeowners</Link>
        <Link href="/buyers" onClick={close}>Buyers</Link>
        <Link href="/partners" onClick={close}>Partners</Link>
        <Link href="/foreclosure" onClick={close}>Counties</Link>
        <Link href="/guides" onClick={close}>Guides</Link>
        <Link className="pill dark" href="/homeowners" onClick={close}>
          Get your numbers <sub>→</sub>
        </Link>
      </nav>
      {/* Without this the mobile breakpoint hides the nav entirely and
          there is no way to reach any page from a phone. */}
      <button
        className="navtog"
        type="button"
        aria-expanded={open}
        aria-controls="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : "Menu"}
      </button>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero full">
      <div className="hcard">
        <div className="hcopy" data-stagger="90">
          <h1 className="d1 r">Built to keep your equity.</h1>
          <p className="lede r">
            We find Tennessee homes headed for the courthouse and route them to
            a marketed auction, before the trustee sale takes what you&apos;ve
            spent years building.
          </p>
          <div className="pills r">
            <Link className="pill light" href="/homeowners">
              Get your numbers <sub>→</sub>
            </Link>
            <a className="pill line" href="#math">
              See the math
            </a>
          </div>
        </div>
        <div className="hmedia">
          <div className="frame">
            <LiteVideo
              src="/media/hero.mp4"
              srcMob="/media/hero-mob.mp4"
              poster="/media/hero.jpg"
            />
          </div>
        </div>
      </div>
      <div className="hero-stats">
        <div className="stats" data-stagger="90">
          <div className="stat r">
            <b>
              <Count to={32} />
            </b>
            <span>Counties with a local guide.</span>
          </div>
          <div className="stat r">
            <b>${<Count to={0} />}</b>
            <span>Cost to the homeowner.</span>
          </div>
          <div className="stat r">
            <b>45&ndash;75</b>
            <span>Days from decision to closing.</span>
          </div>
          <div className="stat r">
            <b>10%</b>
            <span>Buyer&rsquo;s premium. They pay it, not you.</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function WhyWeExist() {
  return (
    <section className="sec full">
      <div className="wrap">
        <div className="split">
          <div data-stagger="80">
            <p className="lbl r">Why we exist</p>
            <h2 className="d2 r">
              Two of three ways
              <br />
              out end at zero.
            </h2>
          </div>
          <div data-stagger="80">
            <p className="lede r">
              When a home heads for the courthouse the bank takes it, or a cash
              buyer takes most of it. Both are the default.
            </p>
            <p className="lede r">
              The third way, keeping the equity and still hitting the
              lender&apos;s deadline, only happens if someone builds it. So we
              did.
            </p>
            <p className="r">
              <Link className="pill line" href="/manifesto">
                Read the manifesto <sub>→</sub>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ThreeWaysIn() {
  const lanes = [
    {
      href: "/homeowners",
      img: "/media/homeowner.jpg",
      h: "Homeowners",
      p: "There's a sale date on your house. Get all three numbers before you sign anything.",
      cta: "Get my numbers",
    },
    {
      href: "/buyers",
      img: "/media/house-single.jpg",
      h: "Buyers",
      p: "Equity-positive Tennessee homes with clean title. Before the MLS, before Auction.com.",
      cta: "Register for access",
    },
    {
      href: "/partners",
      img: "/media/partner.jpg",
      h: "Auction firms",
      p: "Qualified sellers with verified equity and real deadlines. You run the sale.",
      cta: "Partner with us",
    },
  ]
  return (
    <section className="sec full">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">Who you are</p>
            <h2 className="d2 r">Three ways in.</h2>
          </div>
          <p className="lede note r">
            Whichever one is yours, the numbers are on the table from the first
            conversation.
          </p>
        </div>
        <div className="grid3" data-stagger="90">
          {lanes.map((l) => (
            <Link className="tile r" key={l.href} href={l.href}>
              <span className="media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.img} alt="" loading="lazy" decoding="async" />
              </span>
              <h3 className="d3">{l.h}</h3>
              <p>{l.p}</p>
              <span className="pill line">
                {l.cta} <sub>→</sub>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

const MEDIANS = [
  { label: "Davidson · $484k", v: 484000 },
  { label: "Knox · $391k", v: 391000 },
  { label: "Shelby · $222k", v: 222000 },
]

function Ledger() {
  const [value, setValue] = useState(484000)
  const [ltv, setLtv] = useState(60)

  const m = useMemo(() => {
    const owed = Math.round(value * (ltv / 100))
    const cash = 0.65 * value - owed
    const lo = 0.8 * value - owed - CLOSING
    const hi = 0.88 * value - owed - CLOSING
    const scale = Math.max(hi, cash, 1)
    return { owed, cash, lo, hi, scale }
  }, [value, ltv])

  const pickMedian = useCallback((v: number) => setValue(v), [])

  return (
    <section className="sec full" id="math">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">The math</p>
            <h2 className="d2 r">Run your numbers.</h2>
          </div>
          <p className="lede note r">
            One house, three exits. Move the sliders. This is the same
            arithmetic we put in writing on the first call.
          </p>
        </div>

        <div className="ledger r" id="ledger">
          <div className="lg-top">
            <div>
              <p className="lbl" style={{ marginBottom: 12 }}>
                Start from a county median
              </p>
              <div className="chips">
                {MEDIANS.map((c) => (
                  <button
                    key={c.v}
                    className="chip"
                    type="button"
                    aria-pressed={value === c.v}
                    onClick={() => pickMedian(c.v)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="xs" style={{ maxWidth: "28ch", margin: 0 }}>
              Medians per Redfin and Zillow, December 2025.
            </p>
          </div>

          <div className="lg-body">
            <div className="lg-in">
              <div className="fld">
                <div className="top">
                  <label htmlFor="lgValue">What it&apos;s worth</label>
                  <output id="lgValueOut">{usd(value)}</output>
                </div>
                <input
                  type="range"
                  id="lgValue"
                  min={80000}
                  max={1500000}
                  step={1000}
                  value={value}
                  onChange={(e) => setValue(+e.target.value)}
                />
              </div>
              <div className="fld">
                <div className="top">
                  <label htmlFor="lgLtv">What&apos;s still owed</label>
                  <output id="lgLtvOut">
                    {usd(m.owed)} &middot; {ltv}%
                  </output>
                </div>
                <input
                  type="range"
                  id="lgLtv"
                  min={0}
                  max={98}
                  step={1}
                  value={ltv}
                  onChange={(e) => setLtv(+e.target.value)}
                />
              </div>

              {/* Only claim the auction clears when it actually does. */}
              {m.hi <= 0 ? (
                <div className="warn">
                  At this balance nothing clears the loan, not a cash offer and
                  not an auction. That usually points toward a short sale, a
                  loan modification or bankruptcy counsel instead. Call us
                  anyway and we&apos;ll tell you straight what we see.
                </div>
              ) : m.cash < 0 ? (
                <div className="warn">
                  At this balance a cash buyer can&apos;t clear your loan. To
                  make it work they&apos;d ask you to bring{" "}
                  <strong>{usd(Math.abs(m.cash))}</strong> to closing, or they
                  walk away. A marketed auction still clears it.
                </div>
              ) : null}
            </div>

            <div className="lg-out">
              <div className="res">
                <div className="row r-zero">
                  <span className="nm">Trustee sale runs</span>
                  <span className="vv">$0</span>
                  <span className="sub">
                    The bank takes it for the loan balance.
                  </span>
                  <span className="bar">
                    <i />
                  </span>
                </div>
                <div className="row r-cash">
                  <span className="nm">Fast-cash offer</span>
                  <span className="vv">{usd(m.cash)}</span>
                  <span className="sub">
                    About 65% of value, less what you owe.
                  </span>
                  <span
                    className="bar"
                    style={
                      {
                        "--w": `${((Math.max(m.cash, 0) / m.scale) * 100).toFixed(1)}%`,
                      } as React.CSSProperties
                    }
                  >
                    <i />
                  </span>
                </div>
                <div className="row r-auct">
                  <span className="nm">Marketed auction</span>
                  <span className="vv">
                    {m.hi <= 0 ? "$0" : `${usd(m.lo)} – ${usd(m.hi)}`}
                  </span>
                  <span className="sub">
                    Open bidding through a state-licensed firm, less loan and
                    closing.
                  </span>
                  <span
                    className="bar"
                    style={
                      {
                        "--w": `${((Math.max(m.hi, 0) / m.scale) * 100).toFixed(1)}%`,
                      } as React.CSSProperties
                    }
                  >
                    <i />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg-foot">
            <p className="sm" style={{ margin: 0, maxWidth: "46ch" }}>
              The gap between those last two,{" "}
              <strong style={{ color: "var(--ink)" }}>
                {usd(Math.max(m.hi, 0) - Math.max(m.cash, 0))}
              </strong>
              , isn&apos;t a service fee. It&apos;s the price of speed, paid out
              of your pocket.
            </p>
            <Link className="pill light" href="/math">
              Show the math <sub>→</sub>
            </Link>
          </div>
        </div>

        <p className="disc">
          Illustrative, not an appraisal or an offer. Your real numbers depend
          on condition, title, lien position and the sale date.
        </p>
      </div>
    </section>
  )
}

function ThreeSteps() {
  const steps = [
    {
      n: "Step 01",
      h: "We read the filings",
      p: "Trustee notices are public record. We read them daily, so we reach you while there's still time.",
    },
    {
      n: "Step 02",
      h: "You get all three numbers",
      p: "A free 15-minute call: what the trustee sale, a cash offer and an auction each leave you. In writing.",
    },
    {
      n: "Step 03",
      h: "We sell before the date",
      p: "A state-licensed Tennessee firm runs the sale, timed to close ahead of your trustee date.",
    },
  ]
  return (
    <section className="sec full">
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
        <div className="fcard plate r">
          <div className="steps" data-stagger="90">
            {steps.map((s) => (
              <div className="step r" key={s.n}>
                <p className="lbl">{s.n}</p>
                <h3 className="d3">{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
          <div className="r plate-foot">
            <p className="sm" style={{ margin: 0 }}>
              Every filing we can reach, across Tennessee, every business day.
            </p>
            <Link className="pill light" href="/homeowners">
              Get your numbers <sub>→</sub>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function Incentive() {
  return (
    <section className="sec full">
      <div className="wrap">
        <div className="split">
          <div data-stagger="80">
            <p className="lbl r">The incentive</p>
            <h2 className="d2 r">
              We don&apos;t buy
              <br />
              your house.
            </h2>
          </div>
          <div data-stagger="80">
            <p className="lede r">
              If we did, every dollar we made on the spread would be a dollar
              out of your equity.
            </p>
            <p className="lede r">
              Instead we&apos;re paid from the buyer&apos;s premium, the way
              auction houses have been paid for two hundred years. So we have no
              reason to push your price down and every reason to push it up.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* The page emits FAQPage structured data, which Google requires to mirror
   content the visitor can actually see, so the questions have to be on the
   page. Native <details> keeps every answer in the server-rendered HTML. */
function Faq() {
  return (
    <section className="sec full" id="faq">
      <div className="wrap">
        <div className="head">
          <div data-stagger="80">
            <p className="lbl r">Common questions</p>
            <h2 className="d2 r">Straight answers.</h2>
          </div>
        </div>
        <div className="faq r">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function ClosingCta() {
  return (
    <section className="sec full">
      <div className="wrap">
        <div className="fcard plate r" style={{ textAlign: "center" }}>
          <h2 className="d2" style={{ margin: "0 auto", maxWidth: "18ch" }}>
            Get the math before
            <br />
            you sign anything.
          </h2>
          <p
            className="lede"
            style={{ margin: "18px auto 0", maxWidth: "52ch" }}
          >
            Thirty minutes to learn what your house would actually clear is the
            highest-paying half hour you&apos;ll ever work. We&apos;ll do it
            free, even if you go elsewhere.
          </p>
          <div
            className="pills"
            style={{ justifyContent: "center", marginTop: 26 }}
          >
            <Link className="pill light" href="/homeowners">
              Get your numbers <sub>→</sub>
            </Link>
            <a className="pill line" href="mailto:falco@falco.llc">
              falco@falco.llc
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Foot() {
  const cols: Array<{ h: string; links: Array<{ href: string; label: string }> }> = [
    {
      h: "Start here",
      links: [
        { href: "/homeowners", label: "Homeowners" },
        { href: "/buyers", label: "Buyers" },
        { href: "/partners", label: "Auction firms" },
      ],
    },
    {
      h: "Learn",
      links: [
        { href: "/guides", label: "Guides" },
        { href: "/foreclosure", label: "Foreclosure by county" },
        { href: "/math", label: "The math" },
        { href: "/manifesto", label: "Manifesto" },
      ],
    },
    {
      h: "Company",
      links: [
        { href: "/inquiry", label: "Contact" },
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
        { href: "/sms-consent", label: "Text opt-in" },
      ],
    },
  ]
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="fgrid">
          <div>
            <Link className="brand" href="/">
              FALCO
            </Link>
            <p className="sm" style={{ maxWidth: "30ch", marginTop: 14 }}>
              Tennessee distressed property intelligence and auction routing.
              Patrick Armour, TN Auctioneer #7622.
            </p>
            <p className="sm" style={{ marginTop: 10 }}>
              <a href="mailto:falco@falco.llc">falco@falco.llc</a>
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <p className="lbl">{c.h}</p>
              <ul className="clist">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="fbot">
          <span>© 2026 FALCO</span>
          <span>Tennessee</span>
        </div>
      </div>
    </footer>
  )
}
