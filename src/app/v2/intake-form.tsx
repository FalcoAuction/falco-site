"use client"

import StepForm, { postJson, type Step, type StepValues } from "./step-form"
import { ASSET_CLASSES, SITUATIONS } from "./situations"
import { ROLES } from "../start/start-form"

const FAIL = "Something went wrong. Try again or email help@falco.llc."
const OTHER = "Something else"
const s = (v: StepValues, k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "")
const list = (v: StepValues, k: string) => (Array.isArray(v[k]) ? (v[k] as string[]) : [])

/**
 * The /start intake as an embedded step form, so a page can put the form
 * right under its hook. Same payload as /start (posts to the homeowner
 * intake, situation, role and assets ride in situation_notes), so every
 * submission lands in the CRM the same way. Pass `situation` (a slug) or
 * `role` (a ROLES id) to skip those questions.
 */
export default function IntakeForm({
  situation,
  role,
  label,
}: {
  situation?: string
  role?: string
  label?: string
}) {
  const preSituation = SITUATIONS.find((x) => x.slug === situation)
  const preRole = ROLES.find((x) => x.id === role)

  const steps: Step[] = [
    ...(preSituation
      ? []
      : [
          {
            kind: "choice" as const,
            q: "What happened?",
            sub: "Pick the one closest to yours.",
            name: "situation",
            options: [...SITUATIONS.map((x) => x.label), OTHER],
          },
        ]),
    {
      kind: "choice",
      q: "What needs to sell?",
      sub: "Pick all that apply. Not sure is fine.",
      name: "assets",
      multi: true,
      options: ASSET_CLASSES.map((a) => a.h),
    },
    ...(preRole
      ? []
      : [
          {
            kind: "choice" as const,
            q: "Who are you in this?",
            name: "role",
            options: ROLES.map((x) => x.label),
          },
        ]),
    {
      kind: "fields",
      q: "Where is it?",
      sub: "The property address. If it isn't a property, the city is enough.",
      fields: [
        { name: "address", label: "Address or city", required: true, autoComplete: "street-address", placeholder: "123 Main St, Nashville, TN 37206" },
        { name: "county", label: "County", placeholder: "Optional" },
      ],
    },
    {
      kind: "fields",
      q: "The numbers you know.",
      sub: "Leave anything you're not sure of blank.",
      fields: [
        { name: "saleDate", label: "Sale date, if there is one", type: "date" },
        { name: "owed", label: "Roughly what's owed on it", inputMode: "numeric", placeholder: "e.g. 220000" },
      ],
    },
    {
      kind: "fields",
      q: "How do we reach you?",
      sub: "We only use this to get back to you.",
      fields: [
        { name: "fullName", label: "Your name", required: true, autoComplete: "name" },
        { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
        { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "Optional" },
        { name: "notes", label: "Anything else", type: "textarea", placeholder: "Who's involved, what you've tried. Optional." },
      ],
    },
  ]

  return (
    <StepForm
      label={label}
      submitLabel="Get my numbers"
      steps={steps}
      smsOptIn={{ name: "fullName", phone: "phone", property: "address" }}
      onSubmit={(v) => {
        const sitLabel = preSituation?.label ?? s(v, "situation")
        const sitSlug =
          preSituation?.slug ??
          SITUATIONS.find((x) => x.label === sitLabel)?.slug ??
          (sitLabel ? "other" : "unspecified")
        const roleLabel = preRole?.label ?? s(v, "role")
        const assets = list(v, "assets")
        const message = [
          `Situation: ${sitLabel || "(not given)"}`,
          roleLabel && `I am: ${roleLabel}`,
          assets.length > 0 && `Needs to sell: ${assets.join(", ")}`,
          "",
          s(v, "notes") || "(no notes)",
        ]
          .filter((l) => l !== false && l !== "")
          .join("\n")
        return postJson(
          "/api/homeowners/request",
          {
            fullName: s(v, "fullName"),
            email: s(v, "email"),
            phone: s(v, "phone"),
            propertyAddress: s(v, "address"),
            county: s(v, "county"),
            trusteeSaleDate: s(v, "saleDate") || null,
            mortgageBalance: s(v, "owed") || null,
            bestCallback: "",
            situationNotes: message,
            referrer: `start:${sitSlug}`,
          },
          FAIL
        )
      }}
      done={{
        title: "Thank you. We've got it.",
        text: "We'll send your numbers within one business day: what it would likely clear and who would sell it. Nothing is owed either way.",
      }}
    />
  )
}
