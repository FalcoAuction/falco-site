"use client"

import StepForm, { postJson, type StepValues } from "../v2/step-form"
import { SitePage } from "../v2/site-page"

const FAIL = "Something went wrong. Try again or email help@falco.llc."
const s = (v: StepValues, k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "")

/** Homeowner request, one question per screen. Same payload as before. */
export default function HomeownerForm() {
  return (
    <SitePage>
      <div className="st-wrap">
        <StepForm
          label="For homeowners. Free, and nothing is owed either way."
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
    </SitePage>
  )
}
