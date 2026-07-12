import {
  GuideShell,
  GuideSection,
  GuideKey,
  GuideNote,
  Cite,
  GuideRelated,
  GuideJsonLd,
} from "../guide-chrome"

export const metadata = {
  title: "The Tennessee Foreclosure Process, Explained Step by Step | FALCO",
  description:
    "How a Tennessee trustee sale (non-judicial foreclosure) works: the notice, the timeline, sale day, redemption, deficiency, and the options you have at each stage. Plain English, with the actual TN Code sections.",
  alternates: { canonical: "/guides/tennessee-foreclosure-process" },
}

export default function TnForeclosureProcessGuide() {
  return (
    <>
      <GuideJsonLd
        slug="tennessee-foreclosure-process"
        headline="The Tennessee Foreclosure Process, Explained Step by Step"
        description="How a Tennessee trustee sale (non-judicial foreclosure) works: the notice, the timeline, sale day, redemption, deficiency, and the options at each stage, with the actual TN Code sections."
        datePublished="2026-07-12"
        dateModified="2026-07-12"
        breadcrumbName="Tennessee Foreclosure Process"
      />
      <GuideShell
        eyebrow="Foreclosure guide"
        title={
          <>
            The Tennessee foreclosure process,{" "}
            <span className="text-emerald-400">start to finish</span>.
          </>
        }
        standfirst={
          <>
            Tennessee moves fast. It is one of the quickest states in the
            country to take a home. Here is exactly how a trustee sale works,
            how long it takes, and what your options are at each step, with
            the real law behind each one.
          </>
        }
        updated="July 2026"
      >
        <GuideSection title="Tennessee is a non-judicial foreclosure state">
          <p>
            Most Tennessee foreclosures never see a courtroom. When you took
            out your mortgage, you almost certainly signed a{" "}
            <strong className="text-white/90">deed of trust</strong>, which
            names a neutral third party, the{" "}
            <strong className="text-white/90">trustee</strong>, and gives that
            trustee the power to sell the home if you fall behind. Because a
            judge is not involved, this is called a non-judicial, or{" "}
            &quot;power of sale,&quot; foreclosure. It is governed by Tennessee
            Code Title 35, Chapter 5.
            <Cite href="https://codes.findlaw.com/tn/title-35-fiduciaries-and-trust-estates/tn-code-sect-35-5-101/" n={1} />
          </p>
          <GuideKey>
            No court means no built-in delay. A Tennessee trustee sale can
            happen roughly a month after the required notice runs. That speed
            is the single most important thing to understand: the clock is
            shorter here than in most states.
          </GuideKey>
        </GuideSection>

        <GuideSection id="timeline" title="The timeline, step by step">
          <p>
            Here is the sequence from a missed payment to the sale, with the
            typical timing. Yours can run longer if the servicer is reviewing
            you for help, or if you file for bankruptcy.
          </p>

          <GuideNote label="Step 1 — You fall behind (day 0 to ~120)">
            Under federal mortgage-servicing rules, your servicer generally
            cannot start the foreclosure until you are{" "}
            <strong className="text-white/85">more than 120 days behind</strong>
            .<Cite href="https://www.law.cornell.edu/cfr/text/12/1024" n={2} /> This
            120-day window is usually the real gate, and it is also your best
            window to act, because you have the most options while nothing has
            been filed yet.
          </GuideNote>

          <GuideNote label="Step 2 — Notice of the sale is published">
            Once the servicer moves forward, Tennessee law requires the sale to
            be advertised in a newspaper in the county where the property sits.
            As of a 2025 change in the law, that is now{" "}
            <strong className="text-white/85">at least two published notices</strong>
            {" "}(it used to be three), and the sale must also be posted online
            for at least 20 continuous days. The{" "}
            <strong className="text-white/85">first notice has to run at least
            20 days before the sale date</strong>.
            <Cite href="https://codes.findlaw.com/tn/title-35-fiduciaries-and-trust-estates/tn-code-sect-35-5-101/" n={1} />{" "}
            The trustee also has to mail you a copy of the notice by certified
            mail on or before that first publication date.
          </GuideNote>

          <GuideNote label="Step 3 — The sale date arrives">
            The trustee sale is a public auction, almost always held at the
            county courthouse. Anyone can bid, including the lender, which
            usually bids the amount you owe. The winning bidder has to pay
            immediately in cash or certified funds. In about 60 seconds, the
            home changes hands.
          </GuideNote>

          <GuideKey>
            Fastest realistic path: about four months from your first missed
            payment to a sale, made up of the ~120-day federal period plus the
            ~20-to-30-day notice window. Many cases run longer. Almost none run
            shorter.
          </GuideKey>

          <p className="text-white/55 text-[14px]">
            One wrinkle: if the county has no newspaper, the notice gets posted
            for 30 days in at least five public places, one of which must be
            the courthouse door.
            <Cite href="https://codes.findlaw.com/tn/title-35-fiduciaries-and-trust-estates/tn-code-sect-35-5-103/" n={3} />
          </p>
        </GuideSection>

        <GuideSection id="what-changed-2025" title="What changed in 2025">
          <p>
            Tennessee updated its foreclosure-notice rules effective{" "}
            <strong className="text-white/90">July 1, 2025</strong> (Public
            Chapter 515, the bill practitioners call the Foreclosure
            Modernization Act).
            <Cite href="https://wapp.capitol.tn.gov/apps/BillInfo/default.aspx?BillNumber=HB1127&GA=114" n={4} />{" "}
            The headline changes: newspaper notices dropped from three to two,
            a new online-posting requirement was added (20 continuous days,
            through a posting company registered with the Tennessee Secretary
            of State), and postponement rules were clarified. The 20-day
            minimum before the sale did not change.
          </p>
          <p className="text-white/55 text-[14px]">
            Practical takeaway: the notice period is slightly shorter and now
            lives online too, so a sale is easier to miss in the paper but
            easier to find on the web. If you think a sale may be scheduled,
            the online posting is worth checking.
          </p>
        </GuideSection>

        <GuideSection id="options" title="Your options at each stage">
          <p>
            The options narrow as the sale date gets closer. This is the part
            the cash buyers calling you would rather you not map out, because
            several of these keep more money in your pocket than their offer
            does.
          </p>

          <GuideNote label="Reinstating (curing the default)">
            Most Tennessee deeds of trust let you{" "}
            <strong className="text-white/85">reinstate</strong> by paying the
            past-due amount, plus fees and costs, any time before the sale.
            This is a right that comes from your loan contract, not a general
            state law, so the exact deadline is in your paperwork. If you can
            raise the arrears, this stops the sale and puts the loan back on
            track.
          </GuideNote>

          <GuideNote label="Selling before the sale (this is where equity is saved)">
            If you have equity, selling the home before the trustee sale is
            usually the option that protects the most money, because the sale
            pays off the loan and{" "}
            <strong className="text-white/85">the rest is yours</strong>. The
            catch is speed: a normal retail listing can take months you may not
            have. A marketed auction runs on a compressed timeline (often 30 to
            45 days) and still exposes the home to real competing buyers, which
            is the whole point. This is what FALCO helps homeowners do, at no
            cost to you.
          </GuideNote>

          <GuideNote label="Chapter 13 bankruptcy">
            Filing Chapter 13 triggers an{" "}
            <strong className="text-white/85">automatic stay</strong> that
            halts the trustee sale immediately, even the morning of. It is the
            one tool that reliably stops a sale in the final days, and it lets
            you catch up arrears over time. It also has real long-term
            consequences. This is a legal decision for a Tennessee bankruptcy
            attorney, not something to do on a website&apos;s say-so.
          </GuideNote>

          <GuideNote label="Asking the lender to postpone">
            The lender, through the trustee, controls whether a sale gets
            postponed. There is no guarantee, but a postponement is more
            plausible when there is a real, active sale process on the property
            (a signed listing or auction agreement) that would pay the loan
            off. It is worth asking, in writing, with something concrete to
            point to.
          </GuideNote>

          <GuideNote label="Short sale (only if you are underwater)">
            If you owe more than the home is worth, a sale requires the lender
            to accept less than the full balance, which is a{" "}
            <strong className="text-white/85">short sale</strong>. These are
            more complex and are best handled through a licensed Tennessee real
            estate broker. See our{" "}
            <a href="/guides/short-sale-vs-auction" className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4">
              short sale guide
            </a>{" "}
            for how that path compares.
          </GuideNote>
        </GuideSection>

        <GuideSection id="after-the-sale" title="After the sale: redemption, surplus, deficiency">
          <p>
            Three things people ask about once the gavel falls. The honest
            answers are not what most homeowners hope.
          </p>

          <GuideNote label="Can I get the house back? (Redemption)">
            Tennessee law does technically provide a two-year right to redeem
            after a sale.
            <Cite href="https://law.justia.com/codes/tennessee/title-66/chapter-8/section-66-8-101/" n={6} /> But
            that right can be waived in the deed of trust, and{" "}
            <strong className="text-white/85">nearly every Tennessee mortgage
            waives it</strong>. In practice, once the trustee sale closes, the
            home is gone. Do not count on redemption.
          </GuideNote>

          <GuideNote label="What happens to money above what I owed? (Surplus)">
            If the home sells for more than the debt plus costs, the extra,
            called <strong className="text-white/85">surplus funds</strong>,
            flows down the priority ladder: sale costs, then the foreclosing
            lender, then any junior lienholders, then{" "}
            <strong className="text-white/85">you, the former owner</strong>.
            The trustee holds it and, if there is any dispute, often deposits
            it with the court. If you think there may be surplus after a sale,
            it is worth claiming. It is your money.
          </GuideNote>

          <GuideNote label="Can the lender still come after me? (Deficiency)">
            If the sale brings less than you owed, the lender can pursue you for
            the shortfall, called a{" "}
            <strong className="text-white/85">deficiency judgment</strong>.
            <Cite href="https://natlawreview.com/article/foreclosure-sales-and-deficiency-judgments-tennessee" n={5} /> Tennessee
            law gives you a defense: the deficiency is measured against the
            property&apos;s fair market value, and if you can show the home
            sold for materially less than it was worth, the court uses the
            higher value instead. This is one more reason a low courthouse-step
            price hurts you twice.
          </GuideNote>
        </GuideSection>

        <GuideSection title="The one takeaway">
          <GuideKey>
            In Tennessee, the equity in your home does not survive the trustee
            sale on its own. It disappears the moment the gavel falls. If you
            have equity and any time at all before the sale, the question worth
            asking is not &quot;how do I stop this,&quot; it is &quot;how do I
            sell this on my terms before the courthouse takes it for the loan
            balance.&quot; That is a real option, and it is usually worth far
            more than the cash offer in your inbox.
          </GuideKey>
          <p className="text-white/55 text-[14px]">
            Sources: Tenn. Code Ann. Title 35, Ch. 5 (§§ 35-5-101, 35-5-103,
            35-5-104, 35-5-118); Tenn. Code Ann. § 66-8-101 and § 66-8-103
            (redemption and waiver); Public Chapter 515 (2025), amending Title
            35; 12 C.F.R. Part 1024 (federal 120-day rule). Law changes, and
            how it applies depends on your paperwork. This is general
            information, not legal advice.
          </p>
        </GuideSection>
      </GuideShell>

      <GuideRelated
        links={[
          { href: "/guides/cash-offer-vs-auction", label: "Cash offer vs. marketed auction: the math" },
          { href: "/guides/wholesaler-economics", label: "How a wholesaler prices your house" },
          { href: "/guides/short-sale-vs-auction", label: "Short sale vs. selling before the sale" },
          { href: "/homeowners", label: "Get your numbers: free 15-minute call" },
        ]}
      />
    </>
  )
}
