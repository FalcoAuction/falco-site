"use client"

import { useState } from "react"
import IntakeForm from "./intake-form"
import ProfessionalForm from "./professional-form"
import AgentForm from "../agents/agent-form"
import PartnerForm from "../partners/partner-form"
import BuyerSignupForm from "../buyers/buyer-signup-form"
import { InquiryStepForm } from "../inquiry/inquiry-form"

type Who = "owner" | "executor" | "professional" | "agent" | "partner" | "buyer" | "other"

const OPTIONS: Array<{ id: Who; label: string; seller: boolean }> = [
  { id: "owner", label: "I own it, or it's my family's", seller: true },
  { id: "executor", label: "I'm the executor or administrator", seller: true },
  { id: "professional", label: "Attorney, trustee, lender or lienholder", seller: true },
  { id: "agent", label: "Real estate agent", seller: true },
  { id: "partner", label: "I run an auction firm", seller: false },
  { id: "buyer", label: "I want to buy", seller: false },
  { id: "other", label: "Something else", seller: false },
]

/** /start's ?r= values, plus the older role ids situation pages link with. */
const R_TO_WHO: Record<string, Who> = {
  owner: "owner",
  executor: "executor",
  professional: "professional",
  trustee: "professional",
  lienholder: "professional",
  agent: "agent",
  partner: "partner",
  buyer: "buyer",
  other: "other",
}

/** Situation slug to the professional form's matter. */
const SITUATION_TO_MATTER: Record<string, string> = {
  estate: "Probate estate",
  "business-closing": "Business closing",
  bankruptcy: "Bankruptcy or receivership",
  "lien-sale": "Lien sale",
}

/**
 * One question first, who are you, then the form built for that person:
 * owners and executors get the seller intake, professionals the file
 * intake, agents the referral signup, auction firms the partner form,
 * buyers the buyer list, anyone else the contact form. `audience="seller"`
 * shows only the seller-side choices (situation pages, /math).
 */
export default function WhoRouter({
  situation,
  r,
  audience = "all",
  heading = "h2",
}: {
  situation?: string
  r?: string
  audience?: "all" | "seller"
  heading?: "h1" | "h2"
}) {
  const [who, setWho] = useState<Who | null>(r && R_TO_WHO[r] ? R_TO_WHO[r] : null)
  const options = OPTIONS.filter((o) => audience === "all" || o.seller)
  const Q = heading

  if (!who) {
    return (
      <div className="stf">
        <div className="st-top">
          <div className="st-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={6}>
            <i style={{ width: "6%" }} />
          </div>
          <div className="st-meta">
            <span />
            <span>Start</span>
          </div>
        </div>
        <div className="st-step">
          <Q className="st-q">Who are you?</Q>
          <p className="st-sub">So we ask the right questions.</p>
          <div className="st-opts">
            {options.map((o) => (
              <button key={o.id} type="button" className="st-opt" onClick={() => setWho(o.id)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const form =
    who === "owner" || who === "executor" ? (
      <IntakeForm situation={situation} role={who} />
    ) : who === "professional" ? (
      <ProfessionalForm matter={situation ? SITUATION_TO_MATTER[situation] : undefined} />
    ) : who === "agent" ? (
      <AgentForm />
    ) : who === "partner" ? (
      <PartnerForm />
    ) : who === "buyer" ? (
      <BuyerSignupForm />
    ) : (
      <InquiryStepForm />
    )

  return (
    <div key={who}>
      <button type="button" className="st-back" style={{ marginBottom: 18 }} onClick={() => setWho(null)}>
        ← {options.find((o) => o.id === who)?.label ?? "Change"}
      </button>
      {form}
    </div>
  )
}
