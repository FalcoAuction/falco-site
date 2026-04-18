// Client-safe types and labels — no server imports here.
// Importing from this file is safe in both server and client components.

export type DialerStatus =
  | "new"
  | "attempting_contact"
  | "rpc_made"
  | "auction_booked"
  | "listing_signed"
  | "auction_live"
  | "closed_won"
  | "closed_lost"

export type DialerNextAction =
  | "call"
  | "text"
  | "wait_callback"
  | "hand_to_auction"
  | "drop"
  | "none"

export type DialerChannel = "call" | "text" | "voicemail" | "email" | "note"

export type DialerOutcome =
  | "connected"
  | "voicemail_left"
  | "no_answer"
  | "wrong_number"
  | "hung_up"
  | "booked"
  | "callback_requested"
  | "not_interested"
  | "do_not_call"
  | "note_only"

export type DialerWorkflow = {
  listingSlug: string
  status: DialerStatus
  nextAction: DialerNextAction
  nextActionAt?: string | null
  auctionCallAt?: string | null
  closedLostReason?: string | null
  summaryNotes: string
  lastContactAt?: string | null
  attemptCount: number
  rpcCount: number
  updatedBy: string
  updatedAt: string
  createdAt: string
}

export type DialerActivity = {
  id: string
  listingSlug: string
  occurredAt: string
  channel: DialerChannel
  outcome: DialerOutcome
  notes: string
  nextAction?: DialerNextAction | null
  nextActionAt?: string | null
  createdBy: string
  createdAt: string
}

// Minimal lead shape used by client components — keeps client free of server-only imports.
export type DialerLeadView = {
  slug: string
  title: string
  address?: string
  county?: string
  market?: string
  distressType?: string
  ownerName?: string
  ownerMail?: string
  ownerPhonePrimary?: string
  ownerPhoneSecondary?: string
  ownerPhoneDncStatus?: string
  saleControllerName?: string
  saleControllerPhonePrimary?: string
  saleControllerPhoneSecondary?: string
  trusteePhonePublic?: string
  noticePhone?: string
  currentSaleDate?: string
  originalSaleDate?: string
  equityBand?: string
  mortgageAmount?: number | null
  mortgageLender?: string
  mortgageDate?: string
  lastSaleDate?: string
  avmLow?: number | null
  avmMid?: number | null
  avmHigh?: number | null
  saleStatus?: string
  yearBuilt?: number | null
  buildingAreaSqft?: number | null
  beds?: number | null
  baths?: number | null
  propertyIdentifier?: string
  packetUrl?: string
  packetLabel?: string
  dataCompleteness?: "full" | "solid" | "thin"
  missingFields?: string[]
  workflow: DialerWorkflow
  recentActivities: DialerActivity[]
}

export const STATUS_LABELS: Record<DialerStatus, string> = {
  new: "New",
  attempting_contact: "Attempting Contact",
  rpc_made: "Right-Party Contact",
  auction_booked: "Booked w/ Auction Co.",
  listing_signed: "Listing Signed",
  auction_live: "Auction Live",
  closed_won: "Closed — Won",
  closed_lost: "Closed — Lost",
}

export const NEXT_ACTION_LABELS: Record<DialerNextAction, string> = {
  call: "Call",
  text: "Text",
  wait_callback: "Wait for Callback",
  hand_to_auction: "Hand to Auction Co.",
  drop: "Drop",
  none: "None",
}

export const CHANNEL_LABELS: Record<DialerChannel, string> = {
  call: "Call",
  text: "Text",
  voicemail: "Voicemail",
  email: "Email",
  note: "Note",
}

/** Friendly label + category for a raw distress_type value. Pure function, client-safe. */
export function distressTypeLabel(raw: string | null | undefined): {
  label: string
  category: "lis_pendens" | "pre_foreclosure" | "foreclosure" | "fsbo" | "other"
} {
  const v = String(raw ?? "").trim().toUpperCase()
  if (v === "LIS_PENDENS") return { label: "Lis Pendens", category: "lis_pendens" }
  if (v === "SOT" || v === "SUBSTITUTION_OF_TRUSTEE") {
    return { label: "Pre-Foreclosure (SOT)", category: "pre_foreclosure" }
  }
  if (v === "NOD" || v === "NOTICE_OF_DEFAULT") {
    return { label: "Pre-Foreclosure (NOD)", category: "pre_foreclosure" }
  }
  if (v === "PREFORECLOSURE" || v === "PRE_FORECLOSURE") {
    return { label: "Pre-Foreclosure", category: "pre_foreclosure" }
  }
  if (v === "FORECLOSURE") return { label: "Foreclosure", category: "foreclosure" }
  if (v === "FSBO") return { label: "FSBO", category: "fsbo" }
  return {
    label: v
      ? v.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
      : "—",
    category: "other",
  }
}

export const OUTCOME_LABELS: Record<DialerOutcome, string> = {
  connected: "Connected (live conversation)",
  voicemail_left: "Voicemail left",
  no_answer: "No answer",
  wrong_number: "Wrong number",
  hung_up: "Hung up",
  booked: "Booked auction call",
  callback_requested: "Callback requested",
  not_interested: "Not interested",
  do_not_call: "Do not call",
  note_only: "Internal note (no contact attempt)",
}
