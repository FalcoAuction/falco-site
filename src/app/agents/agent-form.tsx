"use client"

import StepForm, { postJson, type StepValues } from "../v2/step-form"

const FAIL = "Something went wrong. Try again or email pat@falco.llc."
const s = (v: StepValues, k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "")
const list = (v: StepValues, k: string) => (Array.isArray(v[k]) ? (v[k] as string[]) : [])

/** Real estate agent signup, one question per screen. Lands in
 *  general_inquiries with topic "Agent signup" so it shows in the CRM inbox. */
export default function AgentForm() {
  return (
    <StepForm
      steps={[
        {
          kind: "fields",
          q: "Your license.",
          sub: "We check it with the Tennessee Real Estate Commission before anything moves.",
          fields: [
            { name: "fullName", label: "Your name", required: true, autoComplete: "name" },
            { name: "licenseNumber", label: "TN license number", required: true, placeholder: "e.g. 351234" },
          ],
        },
        {
          kind: "fields",
          q: "Your brokerage.",
          sub: "The referral is paid to your principal broker, so we need both.",
          fields: [
            { name: "brokerage", label: "Brokerage", required: true, autoComplete: "organization" },
            { name: "principalBroker", label: "Principal broker", required: true },
          ],
        },
        {
          kind: "choice",
          q: "What do you have?",
          sub: "Pick all that apply.",
          name: "inventory",
          multi: true,
          options: [
            "Expired or stale listings",
            "Estates",
            "Foreclosure deadlines",
            "Houses that won't finance",
            "Investor clients",
            "Land or commercial",
            "Nothing yet",
          ],
        },
        {
          kind: "fields",
          q: "Anything to send now?",
          sub: "An address and what's going on. Optional. You can send it later.",
          fields: [
            { name: "propertyAddress", label: "Property address", autoComplete: "off", placeholder: "123 Main St, Nashville, TN" },
            { name: "notes", label: "What's going on", type: "textarea" },
          ],
        },
        {
          kind: "fields",
          q: "How do we reach you?",
          sub: "We'll be in touch within one business day.",
          fields: [
            { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
            { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "(___) ___-____" },
          ],
        },
      ]}
      smsOptIn={{ name: "fullName", phone: "phone" }}
      onSubmit={(v) =>
        postJson(
          "/api/agents/signup",
          {
            fullName: s(v, "fullName"),
            licenseNumber: s(v, "licenseNumber"),
            brokerage: s(v, "brokerage"),
            principalBroker: s(v, "principalBroker"),
            inventory: list(v, "inventory"),
            propertyAddress: s(v, "propertyAddress"),
            notes: s(v, "notes"),
            email: s(v, "email"),
            phone: s(v, "phone"),
          },
          FAIL
        )
      }
      done={{
        title: "You're signed up.",
        text: "We'll check your license and send the referral agreement to your broker within one business day. Questions before then: pat@falco.llc.",
      }}
    />
  )
}
