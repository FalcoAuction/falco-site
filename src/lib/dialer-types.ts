// Client-safe types and labels — no server imports here.
// Importing from this file is safe in both server and client components.

export type DialerStatus =
  | "new"
  | "attempting_contact"
  | "rpc_made"
  | "parkes_booked"
  | "listing_signed"
  | "auction_live"
  | "closed_won"
  | "closed_lost"

export type DialerNextAction =
  | "call"
  | "text"
  | "wait_callback"
  | "hand_to_parkes"
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
  parkesCallAt?: string | null
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
  yearBuilt?: number | null
  buildingAreaSqft?: number | null
  beds?: number | null
  baths?: number | null
  propertyIdentifier?: string
  packetUrl?: string
  packetLabel?: string
  workflow: DialerWorkflow
  recentActivities: DialerActivity[]
}

export const STATUS_LABELS: Record<DialerStatus, string> = {
  new: "New",
  attempting_contact: "Attempting Contact",
  rpc_made: "Right-Party Contact",
  parkes_booked: "Booked w/ Parkes",
  listing_signed: "Listing Signed",
  auction_live: "Auction Live",
  closed_won: "Closed — Won",
  closed_lost: "Closed — Lost",
}

export const NEXT_ACTION_LABELS: Record<DialerNextAction, string> = {
  call: "Call",
  text: "Text",
  wait_callback: "Wait for Callback",
  hand_to_parkes: "Hand to Parkes",
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

export const OUTCOME_LABELS: Record<DialerOutcome, string> = {
  connected: "Connected (live conversation)",
  voicemail_left: "Voicemail left",
  no_answer: "No answer",
  wrong_number: "Wrong number",
  hung_up: "Hung up",
  booked: "Booked Parkes call",
  callback_requested: "Callback requested",
  not_interested: "Not interested",
  do_not_call: "Do not call",
  note_only: "Internal note (no contact attempt)",
}
