"use client"

import StepForm, { postJson, type StepValues } from "../v2/step-form"
import { AnswersCue, PageHead, PageSec, SitePage } from "../v2/site-page"
import { SITUATION_BY_SLUG } from "../v2/situations"

const FAIL = "Something went wrong. Try again or email help@falco.llc."
const s = (v: StepValues, k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "")

const FORECLOSURE = SITUATION_BY_SLUG["foreclosure"]

/** Homeowner request, one question per screen. Same payload as before.
 *  The no-cost line leads, the form follows, the answers sit below. */
export default function HomeownerForm() {
  return (
    <SitePage>
      <PageHead
        label="For homeowners"
        title="Sell before the trustee sale. Keep your equity."
        lede="No cost to you: no listing fee and no commission from your side. Tell us about the house and we'll send the real numbers within one business day."
      >
        <a className="pill dark" href="#start">
          Get my numbers <sub>→</sub>
        </a>
        <a className="pill line" href="#faq">
          Common questions
        </a>
      </PageHead>

      <PageSec id="start" label="Get your numbers" title="Two minutes to start.">
        <div className="pg-form r">
        <StepForm
          submitLabel="Get my numbers"
          steps={[
            {
              kind: "fields",
              q: "Where is the property?",
              sub: "We'll pull the county records before we call.",
              fields: [
                {
                  name: "propertyAddress",
                  label: "Property address",
                  required: true,
                  placeholder: "123 Main St, Nashville, TN 37206",
                  autoComplete: "street-address",
                },
                { name: "county", label: "County", placeholder: "Davidson, Shelby, Knox..." },
              ],
            },
            {
              kind: "fields",
              q: "The numbers you know.",
              sub: "Leave anything you're not sure of blank.",
              fields: [
                { name: "trusteeSaleDate", label: "Sale date, if there is one", type: "date" },
                { name: "mortgageBalance", label: "Roughly what's owed", inputMode: "numeric", placeholder: "e.g. 285000" },
              ],
            },
            {
              kind: "fields",
              q: "Anything we should know?",
              sub: "Other liens, who lives there, what you've tried. Optional.",
              fields: [{ name: "situationNotes", label: "Anything we should know", type: "textarea" }],
            },
            {
              kind: "choice",
              q: "How did you find us?",
              name: "referrer",
              options: [
                "Google",
                "An attorney or advisor",
                "Family or a friend",
                "A letter or call from FALCO",
                "Something else",
              ],
            },
            {
              kind: "fields",
              q: "How do we reach you?",
              sub: "We'll come back within one business day with the real numbers.",
              fields: [
                { name: "fullName", label: "Your name", required: true, autoComplete: "name" },
                { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
                { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "(___) ___-____" },
                { name: "bestCallback", label: "Best time to call", placeholder: "e.g. weekdays after 6pm" },
              ],
            },
          ]}
          smsOptIn={{ name: "fullName", phone: "phone", property: "propertyAddress" }}
          onSubmit={(v) =>
            postJson(
              "/api/homeowners/request",
              {
                fullName: s(v, "fullName"),
                email: s(v, "email"),
                phone: s(v, "phone"),
                propertyAddress: s(v, "propertyAddress"),
                county: s(v, "county"),
                trusteeSaleDate: s(v, "trusteeSaleDate") || null,
                mortgageBalance: s(v, "mortgageBalance") || null,
                bestCallback: s(v, "bestCallback"),
                situationNotes: s(v, "situationNotes"),
                referrer: s(v, "referrer"),
              },
              FAIL
            )
          }
          done={{
            title: "Thank you. We've got it.",
            text: "We'll reach out within one business day with the real numbers. Questions before then: help@falco.llc.",
          }}
        />
        </div>
        <AnswersCue />
      </PageSec>

      <PageSec
        id="answers"
        label="How it works"
        title="Three steps."
        note="Stop after any one of them."
      >
        <div className="quiet-steps" data-stagger="90">
          {FORECLOSURE.steps.map((st, i) => (
            <div className="r" key={st.h}>
              <span className="n">Step {String(i + 1).padStart(2, "0")}</span>
              <h3 className="d3">{st.h}</h3>
              <p>{st.p}</p>
            </div>
          ))}
        </div>
      </PageSec>

      <PageSec label="What it costs" title="How it gets paid.">
        <ul className="rows r">
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
          {FORECLOSURE.straight.map((t) => (
            <li key={t.h}>
              <b>{t.h}</b>
              <span>{t.p}</span>
            </li>
          ))}
        </ul>
      </PageSec>

      <PageSec id="faq" label="Common questions" title="Straight answers.">
        <div className="faq r">
          {FORECLOSURE.faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </PageSec>
    </SitePage>
  )
}
