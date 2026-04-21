// One-shot diagnostic + cleanup script for vault partners.
// USAGE:
//   node scripts/check-and-clean-vault-partners.mjs           # dry-run, lists current
//   node scripts/check-and-clean-vault-partners.mjs --apply   # actually deletes non-keepers
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing Supabase env vars in .env.local")
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

// Allow-list — emails OR substrings to keep (case-insensitive). Edit before running.
const KEEP_PATTERNS = ["chris", "lanotti", "yuri", "armour", "falcoauction"]

function isKeeper(email = "", name = "") {
  const blob = `${email} ${name}`.toLowerCase()
  return KEEP_PATTERNS.some((p) => blob.includes(p.toLowerCase()))
}

const apply = process.argv.includes("--apply")

async function listAll(table, label) {
  const { data, error } = await sb.from(table).select("*").limit(1000)
  if (error) {
    if (error.code === "42P01") {
      console.log(`  (${table} does not exist — skipping)`)
      return []
    }
    console.error(`${label} list error:`, error.message)
    return []
  }
  return data ?? []
}

console.log("=== VAULT PARTNER AUDIT ===")
console.log(`mode: ${apply ? "APPLY (will delete)" : "DRY RUN (no writes)"}`)
console.log(`keeping anything matching: ${KEEP_PATTERNS.join(", ")}`)
console.log()

// 1. partner_approvals (the main approval list — drives /partner-login + vault metrics)
const approvals = await listAll("partner_approvals", "partner_approvals")
console.log(`-- partner_approvals (${approvals.length} rows) --`)
let approvalsToDelete = []
for (const row of approvals) {
  const email = row.email ?? ""
  const name = row.full_name ?? row.fullName ?? ""
  const keep = isKeeper(email, name)
  console.log(`  ${keep ? "KEEP " : "DEL  "} ${email}  ${name ? `(${name})` : ""}  approved=${row.approved}`)
  if (!keep) approvalsToDelete.push(email)
}

// 2. partner_access_requests (pending / approved / declined access requests)
const requests = await listAll("partner_access_requests", "partner_access_requests")
const realRequests = requests.filter((r) => r.company !== "__falco_system_state__")
console.log(`\n-- partner_access_requests (${realRequests.length} non-system rows) --`)
let requestsToDelete = []
for (const row of realRequests) {
  const email = row.email ?? ""
  const name = row.full_name ?? ""
  const keep = isKeeper(email, name)
  console.log(`  ${keep ? "KEEP " : "DEL  "} ${email}  ${name ? `(${name})` : ""}  status=${row.status}`)
  if (!keep) requestsToDelete.push(row.id)
}

console.log("\n=== SUMMARY ===")
console.log(`partner_approvals to delete: ${approvalsToDelete.length}`)
console.log(`partner_access_requests to delete: ${requestsToDelete.length}`)

if (!apply) {
  console.log("\nDry run complete. Re-run with --apply to actually delete.")
  process.exit(0)
}

if (approvalsToDelete.length > 0) {
  const { error } = await sb.from("partner_approvals").delete().in("email", approvalsToDelete)
  if (error) console.error("approvals delete error:", error.message)
  else console.log(`  deleted ${approvalsToDelete.length} from partner_approvals`)
}
if (requestsToDelete.length > 0) {
  const { error } = await sb.from("partner_access_requests").delete().in("id", requestsToDelete)
  if (error) console.error("requests delete error:", error.message)
  else console.log(`  deleted ${requestsToDelete.length} from partner_access_requests`)
}

console.log("\nDone.")
