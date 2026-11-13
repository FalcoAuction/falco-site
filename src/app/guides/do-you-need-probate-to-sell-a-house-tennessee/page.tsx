import Link from "next/link"
import {
  GuideShell,
  GuideSection,
  GuideKey,
  GuideNote,
  Cite,
  GuideRelated,
  GuideJsonLd,
  GuideFaq,
  GuideSources,
} from "../guide-chrome"

const SLUG = "do-you-need-probate-to-sell-a-house-tennessee"
const HEADLINE = "Do You Need Probate to Sell a House in Tennessee?"
const DESCRIPTION =
  "Not always. When Tennessee heirs can sell an inherited house without opening an estate, the six-month rule that protects buyers from estate creditors, probating a will as a muniment of title, and property that skips probate entirely."

export const metadata = {
  title: `${HEADLINE} | FALCO`,
  description: DESCRIPTION,
  alternates: { canonical: `/guides/${SLUG}` },
}

const SOURCES = [
  { n: 1, label: "Tenn. Code Ann. § 31-2-103 (real property vests in heirs or devisees at death)", href: "https://codes.findlaw.com/tn/title-31-descent-and-distribution/tn-code-sect-31-2-103/" },
  { n: 2, label: "Tenn. Code Ann. § 30-2-408 (heirs' conveyances; purchasers and estate creditors)", href: "https://codes.findlaw.com/tn/title-30-administration-of-estates/tn-code-sect-30-2-408/" },
  { n: 3, label: "Tenn. Code Ann. § 32-2-111 (will admitted to probate as a muniment of title)", href: "https://codes.findlaw.com/tn/title-32-wills/tn-code-sect-32-2-111/" },
  { n: 4, label: "Tenn. Code Ann. § 30-2-712 (recorded affidavit of heirship)", href: "https://codes.findlaw.com/tn/title-30-administration-of-estates/tn-code-sect-30-2-712/" },
  { n: 5, label: "Tenn. Code Ann. § 30-2-418 (court-ordered sale of real property to pay debts)", href: "https://law.justia.com/codes/tennessee/title-30/chapter-2/part-4/section-30-2-418/" },
  { n: 6, label: "Heirs of Ellis v. Estate of Ellis (Tenn. Ct. App. 2001): tenancy by the entirety passes to the surviving spouse", href: "https://case-law.vlex.com/vid/heirs-of-neil-g-894063989" },
  { n: 7, label: "Tenn. Code Ann. § 66-1-107 (joint tenancy shares descend like tenancy in common)", href: "https://codes.findlaw.com/tn/title-66-property/tn-code-sect-66-1-107/" },
  { n: 8, label: "Tennessee General Assembly, HB1793 (2026 transfer-on-death deed bill, withdrawn)", href: "https://wapp.capitol.tn.gov/apps/BillInfo/Default.aspx?BillNumber=HB1793&GA=114" },
  { n: 9, label: "Tenn. Code Ann. § 29-27-201 (partition sale)", href: "https://codes.findlaw.com/tn/title-29-remedies-and-special-proceedings/tn-code-sect-29-27-201/" },
]
const src = (n: number) => SOURCES[n - 1].href

const ANSWER =
  "Not always. In Tennessee a house passes at death to the heirs, or to the people named in the will, so they can often sell it by all signing the deed. But for the first six months after the death, a buyer from the heirs takes the house still exposed to the estate's creditors, and a will usually has to be probated, at least as a muniment of title, before the people it names can sell."

const FAQ = [
  {
    q: "Can heirs sell a house in Tennessee without probate?",
    a: "Often, yes. Tennessee real estate vests in the heirs immediately at death, so the heirs can sell by all signing the deed. The catch is timing: for six months after the death, a buyer from the heirs takes the property still subject to the estate's creditors. After six months, if no personal representative has qualified, a buyer for value takes free of creditors who do not hold a lien, unless the buyer actually knew about the debt.",
  },
  {
    q: "What is a muniment of title in Tennessee?",
    a: "It is a way to probate a will only to prove who owns property under it, without appointing an executor or administering an estate. Tennessee allows a will to be admitted as a muniment of title regardless of when the person died.",
  },
  {
    q: "Does Tennessee have transfer-on-death deeds?",
    a: "No. Bills to create transfer-on-death deeds for real estate were filed in 2025 and 2026, but none became law. In Tennessee, real estate passes outside probate mainly through tenancy by the entirety between spouses, a deed that expressly creates a right of survivorship, or a trust.",
  },
  {
    q: "When does a house have to go through a full probate in Tennessee?",
    a: "A full estate is usually needed when the estate's debts have to be paid from the house, when someone needs court authority to sign for the estate, or when there are disputes that need a court. If the other assets cannot cover the debts, the personal representative can ask the court to order the real estate sold.",
  },
  {
    q: "What if one heir will not sign the deed?",
    a: "Then the heirs cannot give a buyer clean title together. Any co-owner can ask a Tennessee court to partition the property, and the court can order it sold if it cannot be fairly divided or a sale is clearly better for the owners.",
  },
  {
    q: "What does it cost to sell through FALCO?",
    a: "No cost to you. The buyer pays a 10% premium on top of the winning bid, and FALCO is paid from that premium. FALCO does not buy, list or broker real estate. A licensed Tennessee real estate and auction firm runs every real estate sale.",
  },
]

export default function ProbateToSellGuide() {
  return (
    <>
      <GuideJsonLd
        slug={SLUG}
        headline={HEADLINE}
        description={DESCRIPTION}
        datePublished="2026-11-13"
        dateModified="2026-11-13"
        breadcrumbName="Probate to Sell a House?"
      />
      <GuideShell
        variant="situation"
        situation="estate"
        answer={ANSWER}
        eyebrow="Estate guide"
        title="Do you need probate to sell a house in Tennessee?"
        standfirst={
          <>
            Families often assume nothing can happen until a court gets
            involved. In Tennessee, the house usually belongs to the heirs the
            moment the owner dies. Whether you can sell it without opening an
            estate depends on three things: whether there is a will, whether
            the estate owes money, and how long it has been.
          </>
        }
        updated="November 2026"
      >
        <GuideSection title="The house already belongs to the heirs">
          <p>
            Tennessee law says the real property of a person who dies without
            a will vests immediately in the heirs at death. If there is a will,
            the real estate goes to the people the will names, unless the will
            directs that it be handled as part of the estate.
            <Cite href={src(1)} n={1} />
          </p>
          <p>
            That is why heirs can often sell without a probate case: they
            already own the house. What they need is every owner&apos;s
            signature on the deed, and enough proof of who the owners are for
            a buyer&apos;s title company to insure the sale.
          </p>
          <GuideNote label="Proving who the heirs are">
            Tennessee lets an affidavit stating the family facts that identify
            a person&apos;s heirs be recorded with the register of deeds. A
            recorded affidavit of heirship is evidence of those facts, but it
            does not itself transfer title.
            <Cite href={src(4)} n={4} />
          </GuideNote>
        </GuideSection>

        <GuideSection id="six-months" title="The six-month rule that buyers care about">
          <p>
            This is the part most families never hear about. A house owned by
            heirs can still be reached by the dead person&apos;s creditors for a
            while, and Tennessee law draws the line at six months.
            <Cite href={src(2)} n={2} />
          </p>
          <GuideNote label="In the first six months after death">
            A buyer who pays for the house still takes it subject to the
            estate&apos;s creditors. If an estate is opened in that window,
            proven claims can become liens that creditors enforce against the
            property in the buyer&apos;s hands.
            <Cite href={src(2)} n={2} />
          </GuideNote>
          <GuideNote label="After six months, with no estate opened">
            If six months have passed since the death and no personal
            representative has qualified, a buyer for value takes the property
            free of creditors who do not hold a lien, unless the buyer actually
            knew about the debt. After six months, a buyer also takes free of
            claims under a will that was never probated, again unless the buyer
            actually knew about it.
            <Cite href={src(2)} n={2} />
          </GuideNote>
          <GuideNote label="The heirs stay on the hook">
            An heir who sells before a creditor sues can still be liable to
            that creditor, up to the value of the land.
            <Cite href={src(2)} n={2} />
          </GuideNote>
          <GuideKey>
            In practice: a sale by heirs is cleanest after six months, with no
            estate opened and no known unpaid debts. If the person died
            recently or owed money, talk to an estate attorney before signing
            a contract.
          </GuideKey>
        </GuideSection>

        <GuideSection id="will" title="If there is a will: muniment of title">
          <p>
            When there is a will, the people it names usually need it probated
            before they can sell. That does not always mean a full estate.
            Tennessee lets a will be admitted to probate as a{" "}
            <strong>muniment of title</strong>, which proves who owns property
            under the will without appointing an executor or administering an
            estate, regardless of when the person died.
            <Cite href={src(3)} n={3} />
          </p>
          <p>
            It is often the simplest path when the will leaves the house to
            specific people and the estate has no debts that need the house to
            pay them. An attorney files it with the probate court.
          </p>
        </GuideSection>

        <GuideSection id="full-probate" title="When you do need a full estate">
          <ul>
            <li>
              <strong>The estate owes money the house has to pay.</strong> If
              the other assets cannot cover the debts, the personal
              representative can ask the court to order the real estate sold.
              <Cite href={src(5)} n={5} />
            </li>
            <li>
              <strong>Someone needs authority to sign.</strong> For example,
              when the will gives the executor a power of sale and the
              beneficiaries want the executor to handle it.
            </li>
            <li>
              <strong>The heirs cannot agree.</strong> If one owner will not
              sign, any co-owner can ask a court to partition the property, and
              the court can order it sold.
              <Cite href={src(9)} n={9} /> See{" "}
              <Link href="/guides/selling-inherited-house-with-siblings-tennessee">
                selling an inherited house with siblings
              </Link>
              .
            </li>
          </ul>
          <p>
            Our{" "}
            <Link href="/guides/selling-estate-property-tennessee">
              estate property guide
            </Link>{" "}
            walks through letters, the creditor period and court-ordered sales
            in detail.
          </p>
        </GuideSection>

        <GuideSection id="outside-probate" title="Property that skips probate entirely">
          <GuideNote label="Married couples: tenancy by the entirety">
            When spouses own a home as tenants by the entirety, the survivor
            becomes the sole owner when the other spouse dies.
            <Cite href={src(6)} n={6} />
          </GuideNote>
          <GuideNote label="Joint owners: read the deed">
            Under Tennessee law, a joint tenant&apos;s share passes to their
            heirs the same way as a tenant in common&apos;s share.
            <Cite href={src(7)} n={7} /> A right of survivorship comes from the
            wording of the deed, so check exactly what it says.
          </GuideNote>
          <GuideNote label="Trusts">
            A house titled in a living trust is handled by the trustee under
            the trust&apos;s terms rather than through an estate.
          </GuideNote>
          <GuideNote label="No transfer-on-death deeds">
            Tennessee does not have transfer-on-death deeds for real estate.
            Bills to create them were filed in 2025 and 2026, and none became
            law.
            <Cite href={src(8)} n={8} />
          </GuideNote>
        </GuideSection>

        <GuideSection title="Selling once the path is clear">
          <p>
            Once you know who can sign, the sale itself is a normal real estate
            sale. An auction is often a good fit for inherited houses: there is
            a firm date, buyers compete in the open, and every heir sees the
            same result. FALCO routes the house to the licensed Tennessee real
            estate and auction firm best suited to sell it.
          </p>
          <GuideKey>
            No cost to you. The buyer pays a 10% premium on top of the winning
            bid, and FALCO is paid from that premium.
          </GuideKey>
        </GuideSection>

        <GuideFaq items={FAQ} />

        <GuideSources sources={SOURCES} />

        <GuideRelated
          links={[
            { href: "/guides/selling-estate-property-tennessee", label: "Selling estate and probate property" },
            { href: "/guides/selling-inherited-house-with-siblings-tennessee", label: "Inherited house with siblings" },
            { href: "/guides/tennessee-small-estate-limited-letters", label: "Small estates: limited letters" },
            { href: "/start?s=estate", label: "Tell us about the house" },
          ]}
        />
      </GuideShell>
    </>
  )
}
