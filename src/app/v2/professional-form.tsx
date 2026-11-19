"use client"

import StepForm, { postJson, type Step, type StepValues } from "./step-form"
import { ASSET_CLASSES } from "./situations"

const FAIL = "Something went wrong. Try again or email pat@falco.llc."
const s = (v: StepValues, k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "")
const list = (v: StepValues, k: string) => (Array.isArray(v[k]) ? (v[k] as string[]) : [])

export const PRO_ROLES = [
  "Estate or probate attorney",
  "Executor or administrator",
  "Bankruptcy trustee",
  "Receiver",
  "Lender or creditor",
  "CPA or business advisor",
  "Marina, storage or repair lienholder",
  "Something else",
]

export const PRO_MATTERS = [
  "Probate estate",
  "Bankruptcy or receivership",
  "Business closing",
  "Lien sale",
  "Collateral or loan workout",
  "Something else",
]

/**
 * Intake for attorneys, fiduciaries, trustees, lenders and lienholders:
 * role, matter, assets, where and when, then who to reply to (with firm).
 * Lands in the CRM inbox as "Professional file". Pass `matter` to skip
 * that question on a page that already says what the matter is.
 */
export default function ProfessionalForm({ matter }: { matter?: string }) {
  const preMatter = matter && PRO_MATTERS.includes(matter) ? matter : undefined
  const steps: Step[] = [
    { kind: "choice", q: "What's your role?", name: "role", options: PRO_ROLES },
    ...(preMatter
      ? []
      : [{ kind: "choice" as const, q: "What's the matter?", name: "matter", options: PRO_MATTERS }]),
    {
      kind: "choice",
      q: "What needs to sell?",
      sub: "Pick all that apply. Not sure is fine.",
      name: "assets",
      multi: true,
      options: ASSET_CLASSES.map((a) => a.h),
    },
    {
      kind: "fields",
      q: "Where, and by when?",
      sub: "The county is enough to start. Add the case and any deadline if there is one.",
      fields: [
        { name: "location", label: "County or city", required: true, placeholder: "Davidson County" },
        { name: "caseNumber", label: "Case or docket number", placeholder: "Optional" },
        { name: "deadline", label: "Hearing, sale or bar date", type: "date" },
      ],
    },
    {
      kind: "fields",
      q: "Where do we send the plan?",
      sub: "We reply within one business day.",
      fields: [
        { name: "fullName", label: "Your name", required: true, autoComplete: "name" },
        { name: "firm", label: "Firm or company", autoComplete: "organization" },
        { name: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
        { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "Optional" },
        { name: "notes", label: "Anything about the file", type: "textarea", placeholder: "Optional" },
      ],
    },
  ]

  return (
    <StepForm
      submitLabel="Send the file"
      steps={steps}
      smsOptIn={{ name: "fullName", phone: "phone" }}
      onSubmit={(v) =>
        postJson(
          "/api/professionals/file",
          {
            role: s(v, "role"),
            matter: preMatter ?? s(v, "matter"),
            assets: list(v, "assets"),
            location: s(v, "location"),
            caseNumber: s(v, "caseNumber"),
            deadline: s(v, "deadline") || null,
            fullName: s(v, "fullName"),
            firm: s(v, "firm"),
            email: s(v, "email"),
            phone: s(v, "phone"),
            notes: s(v, "notes"),
          },
          FAIL
        )
      }
      done={{
        title: "Thank you. We've got the file.",
        text: "Within one business day: what is worth auctioning, which licensed Tennessee firm sells each asset class, and what it would likely clear. Questions before then: pat@falco.llc.",
      }}
    />
  )
}
