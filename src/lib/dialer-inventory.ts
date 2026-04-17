import { supabaseAdmin } from "@/lib/supabase-admin"

const SYSTEM_STATE_COMPANY = "__falco_system_state__"
const INVENTORY_KEY = "dialer_inventory"
const INVENTORY_EMAIL = `state+${INVENTORY_KEY}@falco.local`

export type DialerInventoryLead = {
  key: string
  slug: string
  leadKey: string
  address: string
  county: string
  state: string
  distressType: string
  saleStatus: string
  currentSaleDate: string
  originalSaleDate: string
  auctionReadiness: string
  equityBand: string
  dtsDays: number | null
  falcoScore: number | null
  firstSeenAt: string
  ownerName: string
  ownerMail: string
  ownerPhonePrimary: string
  ownerPhoneSecondary: string
  ownerPhoneDncStatus: string
  saleControllerName: string
  saleControllerPhonePrimary: string
  trusteePhonePublic: string
  noticePhone: string
  mortgageLender: string
  mortgageDate: string
  mortgageAmount: number | null
  lastSaleDate: string
  avmLow: number | null
  avmMid: number | null
  avmHigh: number | null
  beds: number | null
  baths: number | null
  buildingAreaSqft: number | null
  yearBuilt: number | null
  vaultSlug: string | null
  packetUrl: string | null
  packetLabel: string | null
}

export type DialerInventorySnapshot = {
  generatedAt: string
  leads: DialerInventoryLead[]
}

export async function loadDialerInventory(): Promise<DialerInventorySnapshot | null> {
  if (!supabaseAdmin) return null

  const { data, error } = await supabaseAdmin
    .from("partner_access_requests")
    .select("notes, created_at")
    .eq("company", SYSTEM_STATE_COMPANY)
    .eq("status", "state_snapshot")
    .eq("email", INVENTORY_EMAIL)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("loadDialerInventory error:", error.message)
    }
    return null
  }
  if (!data?.notes) return null

  try {
    const envelope = JSON.parse(data.notes as string)
    const payload = envelope?.payload
    if (!payload || !Array.isArray(payload.leads)) return null
    return {
      generatedAt: String(envelope.updatedAt ?? payload.generatedAt ?? ""),
      leads: payload.leads as DialerInventoryLead[],
    }
  } catch (err) {
    console.error("loadDialerInventory parse error:", err)
    return null
  }
}

export async function findDialerInventoryLead(
  key: string
): Promise<DialerInventoryLead | null> {
  const snapshot = await loadDialerInventory()
  if (!snapshot) return null
  return (
    snapshot.leads.find(
      (l) => l.key === key || l.slug === key || l.leadKey === key || l.vaultSlug === key
    ) ?? null
  )
}

// distressTypeLabel lives in dialer-types.ts (client-safe). Re-export here so
// existing imports keep working.
export { distressTypeLabel } from "@/lib/dialer-types"
