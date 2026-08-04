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
  title: "Tennessee Foreclosure Surplus Funds: How to Claim Your Money | FALCO",
  description:
    "If your Tennessee home sold at foreclosure for more than you owed, the surplus may be yours. How it works, where it goes, how to claim it for free, and the fee-cap and scam traps to avoid.",
  alternates: { canonical: "/guides/tennessee-foreclosure-surplus-funds" },
}

export default function SurplusFundsGuide() {
  return (
    <>
      <GuideJsonLd
        slug="tennessee-foreclosure-surplus-funds"
        headline="Tennessee Foreclosure Surplus Funds: How to Claim Your Money"
        description="If a Tennessee home sold at foreclosure for more than the debt, the surplus may belong to the former owner. How it works, where it goes, and how to claim it for free."
        datePublished="2026-07-12"
        dateModified="2026-07-12"
        breadcrumbName="Foreclosure Surplus Funds"
      />
      <GuideShell
        eyebrow="Foreclosure guide"
        title={
          <>
            Tennessee foreclosure{" "}
            <span className="text-[var(--mocha)]">surplus funds</span>: is money
            owed to you?
          </>
        }
        standfirst={
          <>
            When a home sells at foreclosure for more than the debt, the extra
            does not just vanish. It may belong to the former owner. Here is how
            surplus funds work in Tennessee, where the money goes, and how to
            claim what is yours without paying a recovery company a big cut.
          </>
        }
        updated="July 2026"
      >
        <GuideSection title="What surplus funds are">
          <p>
            At a Tennessee foreclosure (trustee) sale, the winning bid sometimes
            comes in higher than the total debt, fees, and costs. That leftover
            is called <strong className="text-[var(--ink)]">surplus funds</strong>{" "}
            (or excess proceeds). It does not go to the bank as a bonus. After
            everyone ahead of you is paid, the remainder belongs to the former
            owner.
          </p>
          <GuideNote label="The order the money is paid out">
            <ol className="list-decimal ml-4 space-y-1">
              <li>Costs of the sale (trustee fees, advertising, etc.)</li>
              <li>The foreclosing lender&apos;s debt</li>
              <li>Any junior lienholders, in the order they were recorded</li>
              <li>
                <strong className="text-[var(--ink)]">The former owner</strong> gets
                whatever is left
              </li>
            </ol>
          </GuideNote>
          <p className="text-[var(--ink-faint)] text-[14px]">
            Tennessee does not have a single statute that scripts this for
            bank foreclosures; distribution follows the deed of trust and
            long-standing law. For court-run (chancery) sales, the surplus rule
            is written down: anything over the debt goes to the debtor or their
            other creditors.
            <Cite href="https://codes.findlaw.com/tn/title-21-proceedings-in-chancery/tn-code-sect-21-1-803.html" n={1} />
          </p>
        </GuideSection>

        <GuideSection id="how-to-claim" title="How the money reaches you">
          <p>
            After a trustee sale, the{" "}
            <strong className="text-[var(--ink)]">trustee holds the surplus</strong>.
            If it is clear who is owed what, the trustee can pay it out. When
            more than one party might have a claim (a junior lienholder and the
            former owner, for example), the trustee cannot decide who wins, so
            they deposit the money with the{" "}
            <strong className="text-[var(--ink)]">Chancery Court</strong> and let a
            judge sort it out. In Tennessee that court office is the{" "}
            <strong className="text-[var(--ink)]">Clerk &amp; Master</strong> of the
            county where the property sits.
            <Cite href="https://chanceryclerkandmaster.nashville.gov/contact-us/about-our-office/" n={2} />
          </p>
          <GuideKey>
            Start by contacting the Clerk &amp; Master of the Chancery Court in
            your county, and the trustee firm that ran your sale. Your{" "}
            <a href="/foreclosure" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              county page
            </a>{" "}
            lists the Clerk &amp; Master for the ten largest Tennessee counties.
          </GuideKey>
          <GuideNote label="A trap to avoid">
            Some county websites post a &quot;Motion to Claim Excess Sale
            Proceeds&quot; form. Read it carefully: those forms are almost always
            for delinquent <strong className="text-[var(--ink)]">property-tax</strong>{" "}
            sales, which are a different process with a different statute, not
            bank foreclosures.
            <Cite href="https://codes.findlaw.com/tn/title-67-taxes-and-licenses/tn-code-sect-67-5-2702/" n={3} /> If
            your money came from a mortgage foreclosure, the tax-sale form is not
            your form. Ask the Clerk &amp; Master which process applies to you.
          </GuideNote>
        </GuideSection>

        <GuideSection id="unclaimed" title="If nobody claims it: the state holds it for you">
          <p>
            Surplus that sits unclaimed does not disappear. Money held by a court
            is treated as abandoned about a year after it becomes payable, and is
            then sent to the{" "}
            <strong className="text-[var(--ink)]">Tennessee Department of Treasury,
            Unclaimed Property Division</strong>.
            <Cite href="https://law.justia.com/codes/tennessee/title-66/chapter-29/part-1/section-66-29-105/" n={4} /> That
            one-year mark is a handoff, not a deadline that forfeits your money,
            you can still claim it after it moves to the state.
          </p>
          <GuideKey>
            You can search for and claim unclaimed property from the state for
            free at{" "}
            <a href="https://claimittn.gov" target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--mocha)] hover:text-[var(--mocha-deep)] underline underline-offset-4">
              ClaimItTN.gov
            </a>
            . There is no fee to search or to claim your own money.
            <Cite href="https://treasury.tn.gov/Unclaimed-Property/About-Unclaimed-Property/Third-Party-Locators" n={5} />
          </GuideKey>
        </GuideSection>

        <GuideSection id="recovery-companies" title="Watch out for 'surplus recovery' companies">
          <p>
            If your home sold with surplus, you may get letters or calls from
            companies offering to &quot;recover&quot; your money for a
            percentage, often 20 to 40 percent. Before you sign anything, know
            two things.
          </p>
          <GuideNote label="1. Once the money is with the state, the fee is capped">
            Tennessee caps what a locator can charge to recover property already
            held by the Treasurer at{" "}
            <strong className="text-[var(--ink)]">10 percent</strong> (or $50,
            whichever is greater), and any such agreement signed within two years
            of the money reaching the state is void.
            <Cite href="https://codes.findlaw.com/tn/title-66-property/tn-code-sect-66-29-176.html" n={6} /> So
            a 30 percent offer to claim money the state is already holding for you
            is not enforceable in Tennessee.
          </GuideNote>
          <GuideNote label="2. Only a lawyer can file your claim in court">
            In Tennessee, drafting and filing a court claim, or representing you
            in the proceeding, is the practice of law. A non-attorney who does
            that for a fee is breaking the law.
            <Cite href="https://www.tncourts.gov/sites/default/files/docs/upl_statutes.pdf" n={7} /> A
            locator can tell you money exists; a licensed Tennessee attorney is
            who actually pursues a disputed claim.
          </GuideNote>
        </GuideSection>

        <GuideSection title="The better outcome: don't leave surplus behind in the first place">
          <GuideKey>
            Surplus funds are what is left after the courthouse auction takes its
            cut, and a courthouse sale almost always clears well below what your
            home is worth. If you still have time before the sale, selling the
            home yourself through a marketed auction usually puts far more of your
            equity in your pocket, directly at closing, than chasing scraps
            afterward. That is what FALCO helps Tennessee homeowners do, at no
            cost to you.
          </GuideKey>
          <p className="text-[var(--ink-faint)] text-[14px]">
            Sources: Tenn. Code Ann. § 21-1-803 (chancery-sale surplus); Title
            66, Ch. 29 (Uniform Unclaimed Property Act, §§ 66-29-105, 66-29-176);
            § 67-5-2702 (tax-sale excess proceeds); §§ 23-3-101 and 23-3-103
            (unauthorized practice of law); Tennessee Department of Treasury.
            This is general information, not legal advice. Talk to a licensed
            Tennessee attorney about claiming surplus in your specific case.
          </p>
        </GuideSection>
      </GuideShell>

      <GuideRelated
        links={[
          { href: "/guides/tennessee-foreclosure-process", label: "How the Tennessee foreclosure process works" },
          { href: "/guides/postpone-trustee-sale-tennessee", label: "Can you postpone the sale?" },
          { href: "/foreclosure", label: "Clerk & Master contacts for your county" },
          { href: "/homeowners", label: "Sell before the sale: free 15-min call" },
        ]}
      />
    </>
  )
}
