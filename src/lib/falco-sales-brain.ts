/**
 * FALCO sales brain — the system prompt + knowledge base the AI uses
 * to compose outbound openers and draft replies in conversations with
 * distressed Tennessee homeowners.
 *
 * Patrick: "I want something smarter and better than me doing the
 * outreach. Pre-built SMS isn't working. I want it actively trying new
 * things and using a knowledge base that works so we can get these
 * leads in the door with Dale."
 *
 * Architecture:
 *   - System prompt = persona, voice rules, knowledge base, success criteria
 *   - Per-message context = lead-specific data injected at call time
 *   - Conversation history = previous SMS in/out for this phone
 *   - Tool outputs = the AI returns draft text + meta (angle used,
 *     suggested action, confidence)
 *
 * IMPORTANT — read before tuning:
 *   - These homeowners are in real distress. Voice = honest, calm,
 *     specific, no salesy energy. Patrick has spent days dialing this
 *     in. Do NOT add hype/urgency theater.
 *   - The deliverable is a homeowner agreeing to a 15-min call with
 *     Dale (Parks Auction & Realty partner). NOT pushing a math sheet
 *     unsolicited. NOT closing the deal in SMS.
 *   - The bot should TRY DIFFERENT ANGLES across leads (variant
 *     testing) but stay in voice within any single thread.
 */

import type { DialerLeadView } from "./dialer-types"

// ────────────────────── Outreach angles (variants) ────────────────────────

export type OutreachAngle =
  | "specific_filing"      // "Saw your filing on [docket]. ..."
  | "equity_math"          // "Your house could clear ~$X. The bank's sale takes it all."
  | "disqualifier"         // "I'm not a debt collector, not buying your house, not a wholesaler."
  | "time_aware"           // "Sale's in [N] days. There's a window if you want to look at it."
  | "local_tn"             // "I'm Patrick, TN auctioneer. Working from your foreclosure filing."
  | "no_cost"              // "No cost to you. Buyer pays the fee. You keep what's yours."
  | "third_path"           // "Bank's auction = $0. Cash buyer = ~25%. There's a third path."
  | "neighbor_softener"    // "I know this isn't a fun text. ..."

export const ANGLE_DESCRIPTIONS: Record<OutreachAngle, string> = {
  specific_filing:
    "Lead with knowing exactly which docket their filing is on. Demonstrates you're not random spam.",
  equity_math:
    "Lead with the specific dollar amount they stand to lose. Concrete + visceral.",
  disqualifier:
    "Front-load what you're NOT (debt collector / buyer / wholesaler) to disarm the brace they have for those callers.",
  time_aware:
    "Lead with the deadline. 'Sale's in N days, you have options.'",
  local_tn:
    "Lead with Patrick + TN credential. Names + auctioneer license = legitimacy signal.",
  no_cost:
    "Lead with 'no cost to you, buyer pays our fee.' Addresses the #1 trust concern early.",
  third_path:
    "Frame the 3 paths: trustee sale ($0), cash buyer (~25%), marketed auction (~85%). Shows the math you bring.",
  neighbor_softener:
    "Acknowledge the awkwardness of the cold text. Lowers their defensive posture before the pitch.",
}

// ───────────────────────── The system prompt ──────────────────────────────

/**
 * The base system prompt. Combined with per-lead context at call time.
 *
 * Voice rules are pulled from Patrick's accumulated feedback in
 * project_patrick_contact.md / feedback_no_em_dashes.md /
 * feedback_no_cost_is_the_pitch.md:
 *   - No em dashes (—). Period.
 *   - "No cost to you" is the pitch, not a footnote.
 *   - Older homeowners. Plain language. No real-estate jargon.
 *   - Don't claim "I'll save your house." Honest about the math.
 */
export const FALCO_SALES_BRAIN_SYSTEM_PROMPT = `
You are FALCO's sales agent. You write SMS messages to Tennessee homeowners facing foreclosure, on behalf of Patrick Yuri Armour (licensed TN auctioneer, founder of FALCO).

YOUR GOAL: get the homeowner to agree to a 15-minute phone call with Dale (FALCO's auction partner at Parks Auction & Realty). NOT to close the deal in SMS. NOT to send them a math sheet unless they specifically ask. NOT to debate or argue.

THE BUSINESS (your knowledge base):

FALCO sits between distressed homeowners and Tennessee state-licensed auction firms. We route the home through a marketed auction on the lender's deadline. The buyer pays a 10% premium on top of the winning bid. The seller pays zero. The equity goes home with the seller.

The three paths a homeowner's equity can disappear:
  1. The trustee sale runs. Bank takes the property for the loan balance. Homeowner walks with $0.
  2. A fast-cash buyer offers ~45-65% of market value. Speed in exchange for a deep discount. Homeowner gets a fraction of their equity.
  3. The homeowner does nothing. Default = path 1.

FALCO's path: state-licensed marketed auction. 30-45 day campaign. Photos, advertising, real buyer pool. Typically clears 85-95% of retail. Buyer pays 10% premium. Seller pays $0.

Tennessee foreclosure mechanics (TCA § 35-5-101): substitute trustee sale notices published 3 consecutive weeks in a newspaper before sale day. The sale itself is a 60-second courthouse formality. After that the equity is gone.

Postponement: lender controls (via the trustee firm). Sometimes granted when there's an active marketed-sale process in motion. NOT guaranteed, but plausible if we contact the servicer with a real listing in hand.

Chapter 13 bankruptcy: automatic stay halts the trustee sale instantly. Only legal mechanism in the final 24-72 hours. Bot suggests a TN BK attorney referral when sale is imminent and other paths have closed.

Reinstatement: homeowner pays all back-due in full. Requires they have the cash, which they usually don't.

KEY PEOPLE:
  - Patrick Yuri Armour: licensed TN auctioneer, founder of FALCO. The face/voice of outreach.
  - Dale: runs the auction partner side at Parks Auction & Realty. Books the homeowner's actual sale. Bot's job is to set up a 15-min call with Dale.
  - FALCO contact: 601-213-8868, falco@falco.llc, falco.llc

VOICE RULES (these matter — Patrick has tuned these):
  - Write like a person texting another person. Not a CSR. Not a salesperson.
  - NO em dashes. Use periods, commas, or split sentences. Em dashes are an AI tell.
  - "No cost to you" is the pitch, not a footnote. Mention it where natural.
  - Plain language. Older homeowners read these. No real-estate jargon (no "ARV", no "MAO", no "LTV", no "DTS").
  - Don't promise outcomes. Don't say "we'll save your house." Say what's true: there's a window, there's math, we'd walk you through it.
  - Don't lead with the math sheet. Get to a conversation first.
  - Don't lead with the call-with-Dale. Build a thread first, then offer it.
  - Acknowledge the awkwardness of cold contact. Lowers their defensive posture.

OUTREACH ANGLES (rotate across leads — don't reuse the same opener pattern across the whole list):
  - specific_filing: lead with knowing exactly which docket their filing is on
  - equity_math: lead with the specific dollar amount they stand to lose
  - disqualifier: lead with what you're NOT (collector / buyer / wholesaler)
  - time_aware: lead with the deadline
  - local_tn: lead with Patrick + TN auctioneer credential
  - no_cost: lead with "no cost to you, buyer pays our fee"
  - third_path: lead with the 3-paths framing
  - neighbor_softener: acknowledge the awkward cold-text first

REPLY HANDLING:
  - When they reply at all, that's the win. Don't pitch on the second message. Build rapport.
  - When they ask "is this real / who are you" → confirm with credentials + a link they can verify (falco.llc, Patrick's TN auctioneer license, Parks Auction & Realty).
  - When they ask "will this cost me anything" → "Zero. Buyer pays our fee on top of the hammer price. You walk with what's yours."
  - When they say "I'm not interested" → "Understood. I'll leave you alone. If anything changes, the door's open." DO NOT push.
  - When they say "I'm filing bankruptcy" → "Smart. Chapter 13 will halt the trustee sale. If you don't have an attorney yet I can text you one." (Then hand off.)
  - When they ask "what could I get" → THEN, and only then, offer the math sheet.
  - When they show interest (asking real questions, engaging) → offer the Dale call. Format: "Want me to set up a quick call with Dale, our auction partner? Maybe 15 minutes, he'll walk through what your property would look like through this process."

NEVER:
  - Promise specific dollar outcomes ("you'll get $200K")
  - Claim affiliation with the lender, government, or any agency
  - Use scare tactics, countdown timers, manufactured urgency
  - Send a math sheet uninvited
  - Argue with objections
  - Use em dashes
  - Sign off with "Best regards" or other formal-letter closers — this is SMS

ALWAYS:
  - Sign Patrick or P. (depending on thread tone)
  - Keep messages short (under 320 characters when possible, hard cap 480)
  - Treat each lead as a person with a hard situation, not a number

OUTPUT FORMAT (you ALWAYS return JSON, no other text):

{
  "draft": "the SMS body to send, ready to copy/paste",
  "angle_used": "one of the OutreachAngle values",
  "confidence": 0.0-1.0 (your confidence the draft is a good move),
  "suggested_action": "send" | "edit_then_send" | "wait" | "escalate_to_patrick" | "honor_optout",
  "rationale": "one short sentence on why you chose this draft",
  "next_step_if_they_reply": "what the bot should be ready to do next"
}
`.trim()

// ───────────────────── Per-lead context builder ──────────────────────────

/**
 * Build the per-call lead-context block. Injected after the system
 * prompt and before any conversation history.
 *
 * Keep this tight — every token costs money on every call. Include
 * only what the bot actually needs to make a good choice.
 */
export function buildLeadContext(lead: DialerLeadView): string {
  const parts: string[] = []

  // Identity
  const firstName =
    (lead.ownerName || "")
      .split(/[\s,]+/)
      .filter(Boolean)
      .find((tok) => tok.length > 1 && tok !== tok.toUpperCase()) ||
    (lead.ownerName || "").split(/\s+/)[0] ||
    "(unknown)"
  parts.push(`Owner: ${lead.ownerName || "(unknown)"}`)
  parts.push(`First name (use this if you greet by name): ${firstName}`)

  // Property
  if (lead.address) parts.push(`Address: ${lead.address}`)
  // Just the street, no city/state/zip — for natural references like "saw [street] on the filing"
  const streetOnly = (lead.address || "").split(",")[0]?.trim()
  if (streetOnly) parts.push(`Street only: ${streetOnly}`)
  if (lead.county) parts.push(`County: ${lead.county}`)
  if (lead.market) parts.push(`Market: ${lead.market}`)

  // Distress posture
  if (lead.distressType) parts.push(`Distress type: ${lead.distressType}`)
  if (lead.currentSaleDate) {
    parts.push(`Trustee sale date: ${lead.currentSaleDate}`)
    const dts = daysFromIso(lead.currentSaleDate)
    if (dts !== null) parts.push(`Days to sale: ${dts}`)
  }

  // Math (ranges, not specific values — keeps the bot from over-promising)
  if (lead.avmMid) {
    const band = avmBand(lead.avmMid)
    parts.push(`Estimated property value band: ${band}`)
  }
  if (lead.equityBand) parts.push(`Equity band: ${lead.equityBand}`)
  if (lead.mortgageLender) parts.push(`Mortgage lender (verified): ${lead.mortgageLender}`)

  // Manual sale-status (postponed/cancelled override)
  if (lead.trusteeSaleStatus) {
    parts.push(`Sale status flag (operator override): ${lead.trusteeSaleStatus}${
      lead.trusteeSaleStatusNote ? ` — ${lead.trusteeSaleStatusNote}` : ""
    }`)
  }

  // Phone / SMS posture
  const lineType = (lead as { ownerPhoneLineType?: string }).ownerPhoneLineType
  if (lineType === "landline") {
    parts.push("PHONE LINE TYPE: landline. SMS will not deliver. Compose call-script instead.")
  } else if (lineType === "fixedVoip" || lineType === "nonFixedVoip") {
    parts.push("PHONE LINE TYPE: VOIP. SMS may not deliver. Compose anyway but flag low confidence.")
  }
  if (lead.ownerPhoneDncStatus === "dnc" || lead.ownerPhoneDncStatus === "true") {
    parts.push("DNC STATUS: do-not-call flagged. Do NOT send. Return suggested_action='honor_optout'.")
  }

  return parts.join("\n")
}

function daysFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function avmBand(mid: number): string {
  if (mid < 150_000) return "under $150K"
  if (mid < 300_000) return "$150K-$300K"
  if (mid < 500_000) return "$300K-$500K"
  if (mid < 800_000) return "$500K-$800K"
  if (mid < 1_500_000) return "$800K-$1.5M"
  return "over $1.5M"
}

// ────────────────── Compose-request shape ────────────────────────────────

/**
 * Input to a compose call: what mode + what context.
 *
 * Modes:
 *   - "opener" — first outbound to a cold lead. Bot picks an angle.
 *   - "reply" — drafting a response to an inbound from the homeowner.
 *               `inbound_message` is the verbatim text they sent.
 *   - "followup" — second/third/fourth touch on a cold lead that
 *                  hasn't replied. Bot picks a DIFFERENT angle than
 *                  prior touches.
 */
export type ComposeRequest =
  | {
      mode: "opener"
      lead_context: string
      hint_angle?: OutreachAngle // optional hint; bot can override
      pasted_thread?: string // optional iMessage thread paste-in
    }
  | {
      mode: "reply"
      lead_context: string
      inbound_message: string
      conversation_history: ConversationMessage[]
      pasted_thread?: string
    }
  | {
      mode: "followup"
      lead_context: string
      prior_angles: OutreachAngle[]
      conversation_history: ConversationMessage[]
      pasted_thread?: string
    }

export type ConversationMessage = {
  direction: "in" | "out"
  body: string
  occurred_at: string // ISO
  angle?: OutreachAngle | null // for outbound only
}

export type ComposeResult = {
  draft: string
  angle_used: OutreachAngle | null
  confidence: number
  suggested_action:
    | "send"
    | "edit_then_send"
    | "wait"
    | "escalate_to_patrick"
    | "honor_optout"
  rationale: string
  next_step_if_they_reply: string
}

// ───────────────────── User message builder ──────────────────────────────

/**
 * Build the user-role message for a compose request. Combined with
 * the FALCO_SALES_BRAIN_SYSTEM_PROMPT in the API call.
 */
export function buildComposeUserMessage(req: ComposeRequest): string {
  const sections: string[] = []

  // Mode-specific framing
  if (req.mode === "opener") {
    sections.push("MODE: first outbound to a cold lead. Pick an angle and write the opener.")
    if (req.hint_angle) {
      sections.push(`Suggested angle (you can override): ${req.hint_angle}`)
    }
  } else if (req.mode === "reply") {
    sections.push(
      "MODE: drafting a reply to an inbound message from the homeowner. Keep voice consistent with prior thread."
    )
    sections.push(`Inbound message they just sent:\n"""\n${req.inbound_message}\n"""`)
  } else if (req.mode === "followup") {
    sections.push(
      "MODE: follow-up to a cold lead who hasn't replied to prior outbound. Pick a DIFFERENT angle than what's been tried."
    )
    if (req.prior_angles.length > 0) {
      sections.push(
        `Angles already tried (DO NOT repeat): ${req.prior_angles.join(", ")}`
      )
    }
  }

  // Lead context block
  sections.push("LEAD CONTEXT:\n" + req.lead_context)

  // Conversation history (for reply + followup modes)
  if (req.mode === "reply" || req.mode === "followup") {
    if (req.conversation_history.length > 0) {
      sections.push(
        "CONVERSATION HISTORY (most recent last):\n" +
          req.conversation_history
            .map(
              (m) =>
                `  [${m.direction === "in" ? "THEM" : "US"}${
                  m.angle ? `, angle=${m.angle}` : ""
                }] ${m.body}`
            )
            .join("\n")
      )
    } else {
      sections.push("(no prior conversation history in our system)")
    }
  }

  // Pasted thread context — when Patrick has been texting from his
  // personal cell and the history isn't logged in our DB, he can paste
  // a screenshot-OCR or copy-paste of the iMessage thread here. Brain
  // treats this as additional ground truth for what's been said.
  if (req.pasted_thread && req.pasted_thread.trim()) {
    sections.push(
      "PASTED CONVERSATION (from Patrick's cell, copy-pasted from iMessage — treat as " +
        "more authoritative than the conversation_history above when they conflict):\n" +
        req.pasted_thread.trim()
    )
  }

  sections.push(
    "Return ONLY the JSON object specified in your system prompt. No prose around it."
  )

  return sections.join("\n\n")
}
