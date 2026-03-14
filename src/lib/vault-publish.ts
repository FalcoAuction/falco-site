import { supabaseAdmin, supabaseAdminConfigError } from "@/lib/supabase-admin"
import { findOperatorVaultCandidateByLeadKeyLive } from "@/lib/operator-vault-candidates"

export async function publishOperatorVaultCandidate(leadKey: string) {
  if (!supabaseAdmin) {
    throw new Error(supabaseAdminConfigError ?? "Supabase admin client is not configured.")
  }

  const candidate = await findOperatorVaultCandidateByLeadKeyLive(leadKey)
  if (!candidate) {
    throw new Error("Publish candidate not found.")
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
