"use client"

import StepForm, { postJson, type StepValues } from "../v2/step-form"
import { SitePage } from "../v2/site-page"

const FAIL = "Something went wrong. Try again or email falco@falco.llc."
const s = (v: StepValues, k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "")

/** General contact, one question per screen. Same payload as before. */
export default function InquiryForm() {
  return (
    <SitePage>
      <div className="st-wrap">
        <StepForm
          label="Contact"
          steps={[
            {
              kind: "choice",
              q: "What's this about?",
              name: "topic",
              options: ["Press", "A partnership", "Investment", "A vendor or service", "Something else"],
            },
            {
              kind: "fields",
              q: "What would you like to say?",
              fields: [
                {
                  name: "message",
                  label: "Your message",
                  type: "textarea",
                  required: true,
                  placeholder: "A little about who you are and what you'd like to talk about.",
                },
              ],
            },
            {
              kind: "fields",
              q: "How do we reach you?",
              sub: "We reply within one business day.",
              fields: [
                { name: "fullName", label: "Your name", required: true, autoComplete: "name" },
                { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
                { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
                { name: "company", label: "Company or organization", autoComplete: "organization" },
              ],
            },
          ]}
          onSubmit={(v) =>
            postJson(
              "/api/inquiry",
              {
                fullName: s(v, "fullName"),
                email: s(v, "email"),
                phone: s(v, "phone"),
                company: s(v, "company"),
                topic: s(v, "topic"),
                message: s(v, "message"),
              },
              FAIL
            )
          }
          done={{
            title: "Thank you. We've got it.",
            text: "We'll reply from falco@falco.llc within one business day.",
          }}
        />
      </div>
    </SitePage>
  )
}
