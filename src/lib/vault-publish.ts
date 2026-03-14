import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import { findOperatorVaultCandidateByLeadKeyLive } from "@/lib/operator-vault-candidates"

function candidatePublishIssues(payload: Record<string, unknown>) {
  const issues: string[] = []
  const saleStatus = String(payload.saleStatus ?? "").trim().toLowerCase()
  const equityBand = String(payload.equityBand ?? "").trim().toUpperCase()

  if (!String(payload.ownerName ?? "").trim()) issues.push("owner")
  if (!String(payload.ownerMail ?? "").trim()) issues.push("mailing")
  if (!String(payload.mortgageLender ?? "").trim()) issues.push("lender")
  if (typeof payload.mortgageAmount !== "number" || !Number.isFinite(payload.mortgageAmount)) {
    issues.push("loan amount")
  }

  const hasContact =
    Boolean(String(payload.ownerPhonePrimary ?? "").trim()) ||
    Boolean(String(payload.ownerPhoneSecondary ?? "").trim()) ||
    Boolean(String(payload.trusteePhonePublic ?? "").trim()) ||
    Boolean(String(payload.noticePhone ?? "").trim())

  if (!hasContact) issues.push("contact path")
  if (saleStatus === "pre_foreclosure" && (!equityBand || equityBand === "UNKNOWN")) {
    issues.push("equity / valuation")
  }

  return issues
}

export async function publishOperatorVaultCandidate(leadKey: string) {
  if (!supabaseAdmin) {
    throw new Error(supabaseAdminConfigError ?? "Supabase admin client is not configured.")
  }

  const candidate = await findOperatorVaultCandidateByLeadKeyLive(leadKey)
  if (!candidate) {
    throw new Error("Publish candidate not found.")
  }

  const payload =
    candidate.listingPayload && typeof candidate.listingPayload === "object"
      ? (candidate.listingPayload as Record<string, unknown>)
      : {}
  const issues = candidatePublishIssues(payload)
  if (issues.length) {
    throw new Error(
      `Candidate needs upstream re-enrichment / packet refresh before vault publish. Missing: ${issues.join(", ")}.`
    )
  }

  const { data, error } = await supabaseAdmin
    .from("vault_listings")
    .upsert(candidate.supabaseRow, { onConflict: "slug" })
    .select("*")
    .single()

  if (error) {
    throw new Error(`Vault publish failed: ${error.message}`)
  }

  return {
    leadKey: candidate.leadKey,
    slug: candidate.slug,
    packetFileName: candidate.packetFileName,
    row: data,
  }
}
