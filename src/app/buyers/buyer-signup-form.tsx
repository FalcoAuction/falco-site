"use client"

import StepForm, { postJson, type StepValues } from "../v2/step-form"

const s = (v: StepValues, k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "")
const list = (v: StepValues, k: string) => (Array.isArray(v[k]) ? (v[k] as string[]) : [])

/** Buyer registration, one question per screen. Same payload as before. */
export default function BuyerSignupForm() {
  return (
    <StepForm
      submitLabel="Register"
      steps={[
        {
          kind: "choice",
          q: "What do you buy?",
          sub: "Pick all that apply.",
          name: "propertyTypes",
          multi: true,
          options: [
            "Homes",
            "Land and farms",
            "Commercial property",
            "Vehicles and equipment",
            "Boats and aircraft",
            "Collections",
          ],
        },
        {
          kind: "fields",
          q: "Where do you buy?",
          sub: "Tennessee counties or metros.",
          fields: [{ name: "counties", label: "Counties or metros", placeholder: "Davidson, Rutherford, Shelby, Knox..." }],
        },
        {
          kind: "fields",
          q: "What's your price range?",
          fields: [
            { name: "priceMin", label: "From", inputMode: "numeric", placeholder: "150000" },
            { name: "priceMax", label: "To", inputMode: "numeric", placeholder: "500000" },
          ],
        },
        {
          kind: "choice",
          q: "Can you close in cash?",
          name: "cashReady",
          options: ["Yes", "No"],
        },
        {
          kind: "fields",
          q: "How do you buy?",
          sub: "All optional.",
          fields: [
            { name: "strategies", label: "Strategy", placeholder: "Flip, hold, resell, use..." },
            { name: "fundingSource", label: "Funding", placeholder: "Cash, lender, HELOC..." },
            { name: "closeSpeedDays", label: "Typical days to close", inputMode: "numeric", placeholder: "e.g. 14" },
          ],
        },
        {
          kind: "fields",
          q: "How do we reach you?",
          sub: "We only email when something matches.",
          fields: [
            { name: "fullName", label: "Full name", required: true, autoComplete: "name" },
            { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
            { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
            { name: "company", label: "Company or team", autoComplete: "organization" },
          ],
        },
      ]}
      onSubmit={(v) =>
        postJson(
          "/api/buyers/register",
          {
            fullName: s(v, "fullName"),
            email: s(v, "email"),
            phone: s(v, "phone"),
            company: s(v, "company"),
            priceMin: s(v, "priceMin") || null,
            priceMax: s(v, "priceMax") || null,
            counties: s(v, "counties"),
            propertyTypes: list(v, "propertyTypes").join(", "),
            strategies: s(v, "strategies"),
            cashReady: s(v, "cashReady") === "Yes",
            fundingSource: s(v, "fundingSource"),
            closeSpeedDays: s(v, "closeSpeedDays") || null,
            notes: "",
            referrer: "",
          },
          "Registration failed."
        )
      }
      done={{
        title: "You're on the list.",
        text: "We'll email you when something matching what you buy is headed to auction.",
      }}
    />
  )
}
