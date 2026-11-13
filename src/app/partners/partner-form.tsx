"use client"

import StepForm, { postJson, type StepValues } from "../v2/step-form"
import { SitePage } from "../v2/site-page"

const FAIL = "Something went wrong. Try again or email sales@falco.llc."
const s = (v: StepValues, k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "")

/** Auction firm partnership inquiry, one question per screen. Same payload as before. */
export default function PartnerForm() {
  return (
    <SitePage>
      <div className="st-wrap">
        <StepForm
          label="For auction firms"
          steps={[
            {
              kind: "fields",
              q: "Tell us about your firm.",
              fields: [
                { name: "company", label: "Company", placeholder: "Your auction company name", autoComplete: "organization" },
                { name: "yearsInBusiness", label: "Years in business", inputMode: "numeric", placeholder: "e.g. 12" },
              ],
            },
            {
              kind: "fields",
              q: "Where do you sell?",
              sub: "The Tennessee counties you cover.",
              fields: [
                { name: "countyCoverage", label: "County coverage", placeholder: "Davidson, Rutherford, Williamson, Shelby..." },
              ],
            },
            {
              kind: "fields",
              q: "How do you work?",
              fields: [
                { name: "dealsPerYear", label: "Sales per year, roughly", inputMode: "numeric", placeholder: "e.g. 40" },
                { name: "feeStructure", label: "Fee structure", placeholder: "e.g. 10% buyer's premium, no seller commission" },
              ],
            },
            {
              kind: "fields",
              q: "Anything else?",
              sub: "Specialties, gaps in your pipeline, what you'd want from a partnership. Optional.",
              fields: [{ name: "notes", label: "Anything else", type: "textarea" }],
            },
            {
              kind: "fields",
              q: "How do we reach you?",
              sub: "We'll set up a call within one business day.",
              fields: [
                { name: "fullName", label: "Your name", required: true, autoComplete: "name" },
                { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
                { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "(___) ___-____" },
              ],
            },
          ]}
          onSubmit={(v) =>
            postJson(
              "/api/partners/inquiry",
              {
                fullName: s(v, "fullName"),
                email: s(v, "email"),
                company: s(v, "company"),
                phone: s(v, "phone"),
                countyCoverage: s(v, "countyCoverage"),
                dealsPerYear: s(v, "dealsPerYear") || null,
                yearsInBusiness: s(v, "yearsInBusiness") || null,
                feeStructure: s(v, "feeStructure"),
                notes: s(v, "notes"),
              },
              FAIL
            )
          }
          done={{
            title: "Thank you. We've got it.",
            text: "We'll reach out within one business day to set up a call. Questions before then: sales@falco.llc.",
          }}
        />
      </div>
    </SitePage>
  )
}
