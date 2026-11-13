"use client"

import StepForm, { postJson, type StepValues } from "../v2/step-form"

// Shown verbatim on the last screen next to an unchecked box, and sent
// with the request so the stored consent matches what the person saw.
const CONSENT_TEXT =
  "I agree to receive case-specific text messages from FALCO (Patrick Armour, TN licensed auctioneer) at the number I provided. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time. Consent is not a condition of any purchase or service."

const s = (v: StepValues, k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "")

/** SMS opt-in, one question per screen. Same payload as before. */
export function ConsentForm() {
  return (
    <StepForm
      submitLabel="Opt in to text messages"
      steps={[
        {
          kind: "fields",
          q: "Who should we text?",
          fields: [
            { name: "name", label: "Your name", required: true, placeholder: "First and last name", autoComplete: "name" },
            { name: "phone", label: "Mobile number", type: "tel", required: true, placeholder: "(615) 555-1234", autoComplete: "tel" },
          ],
        },
        {
          kind: "fields",
          q: "Which property is this about?",
          sub: "Optional.",
          fields: [{ name: "property", label: "Property address", placeholder: "Street, city" }],
        },
        {
          kind: "check",
          q: "Your consent.",
          sub: "Check the box to opt in. You can reply STOP at any time.",
          name: "consent",
          text: CONSENT_TEXT,
        },
      ]}
      onSubmit={(v) =>
        postJson(
          "/api/sms/consent",
          {
            name: s(v, "name"),
            phone: s(v, "phone"),
            property: s(v, "property"),
            consent: v.consent === true,
            consent_text: CONSENT_TEXT,
            website: "", // honeypot
          },
          "Something went wrong. Try again."
        )
      }
      done={{
        title: "You're opted in.",
        text: "Patrick will follow up by text. Reply STOP to any message if you change your mind.",
      }}
    />
  )
}
