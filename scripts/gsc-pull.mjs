// Pull Search Console performance data via the Search Analytics API.
// Zero dependencies: signs the service-account JWT with node:crypto and
// talks to the REST API with fetch. Key lives at .secrets/gsc.json
// (gitignored) — the service account email must be added as a user on
// the falco.llc property in Search Console.
//
// Usage:
//   node scripts/gsc-pull.mjs sites                      # list accessible properties
//   node scripts/gsc-pull.mjs query [days] [rowLimit]    # top queries (default 28d / 250)
//   node scripts/gsc-pull.mjs page [days] [rowLimit]     # top pages
//   node scripts/gsc-pull.mjs querypage [days] [rowLimit]# query+page pairs
// Output: TSV on stdout (query/page, clicks, impressions, ctr, position).

import { readFileSync } from "node:fs"
import { createSign } from "node:crypto"

const KEY_PATH = new URL("../.secrets/gsc.json", import.meta.url)
const key = JSON.parse(readFileSync(KEY_PATH, "utf8"))

const b64u = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url")

async function getToken() {
  const now = Math.floor(Date.now() / 1000)
  const unsigned =
    b64u({ alg: "RS256", typ: "JWT" }) +
    "." +
    b64u({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: key.token_uri,
      iat: now,
      exp: now + 3600,
    })
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(key.private_key, "base64url")
  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  })
  const json = await res.json()
  if (!json.access_token) {
    console.error("TOKEN_ERROR", JSON.stringify(json))
    process.exit(1)
  }
  return json.access_token
}

async function api(token, path, body) {
  const res = await fetch(`https://www.googleapis.com/webmasters/v3${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`API_ERROR ${res.status}`, JSON.stringify(json.error?.message ?? json))
    process.exit(1)
  }
  return json
}

function dateNDaysAgo(n) {
  // GSC data lags ~2 days; anchor the window to (today - 2).
  const d = new Date()
  d.setDate(d.getDate() - 2 - n)
  return d.toISOString().slice(0, 10)
}

const [mode = "sites", daysArg = "28", limitArg = "250"] = process.argv.slice(2)
const days = Number(daysArg)
const rowLimit = Math.min(Number(limitArg), 25000)

const token = await getToken()

if (mode === "sitemaps") {
  const sm = await api(token, `/sites/${encodeURIComponent("https://falco.llc/")}/sitemaps`)
  if (!sm.sitemap?.length) {
    console.log("NO_SITEMAPS_SUBMITTED")
  } else {
    for (const s of sm.sitemap) {
      const c = s.contents?.[0]
      console.log(
        `${s.path}\tlastDownloaded=${s.lastDownloaded ?? "never"}\tsubmitted=${c?.submitted ?? "?"} urls\tindexed=${c?.indexed ?? "?"}\terrors=${s.errors ?? 0} warnings=${s.warnings ?? 0}`
      )
    }
  }
  process.exit(0)
}

async function inspectOne(url) {
  const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: "https://falco.llc/" }),
  })
  const json = await res.json()
  if (!res.ok) {
    return { url, error: json.error?.message ?? JSON.stringify(json) }
  }
  const r = json.inspectionResult?.indexStatusResult
  return {
    url,
    verdict: r?.verdict,
    state: r?.coverageState,
    lastCrawl: r?.lastCrawlTime ?? "never",
  }
}

if (mode === "inspect") {
  const r = await inspectOne(process.argv[3])
  if (r.error) {
    console.error(`INSPECT_ERROR`, r.error)
    process.exit(1)
  }
  console.log(`${r.url}\tverdict=${r.verdict}\tstate=${r.state}\tlastCrawl=${r.lastCrawl}`)
  process.exit(0)
}

if (mode === "sweep") {
  // Inspect every sitemap URL in one process (fast on Windows — avoids
  // per-URL node spawn overhead). Runs in small concurrent batches.
  const sm = await api(
    token,
    `/sites/${encodeURIComponent("https://falco.llc/")}/sitemaps`
  )
  const sitemapUrl = sm.sitemap?.[0]?.path
  const xml = await (await fetch(sitemapUrl)).text()
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  const results = []
  const CONC = 5
  for (let i = 0; i < urls.length; i += CONC) {
    const batch = urls.slice(i, i + CONC)
    results.push(...(await Promise.all(batch.map(inspectOne))))
  }
  const tally = {}
  for (const r of results) {
    const key = r.error ? "ERROR" : r.state
    tally[key] = (tally[key] ?? 0) + 1
    const path = r.url.replace("https://falco.llc", "") || "/"
    console.log(`${r.error ? "ERR " : r.verdict === "PASS" ? "IDX " : "--- "}${path}\t${r.state ?? r.error}`)
  }
  console.log("\n# TALLY")
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`${v}\t${k}`)
  }
  process.exit(0)
}

if (mode === "sites") {
  const sites = await api(token, "/sites")
  if (!sites.siteEntry?.length) {
    console.log("NO_SITES — service account has a token but no property access.")
    console.log("Add falco-gsc@falco-502519.iam.gserviceaccount.com as a user on falco.llc in Search Console.")
  } else {
    for (const s of sites.siteEntry) console.log(`${s.siteUrl}\t${s.permissionLevel}`)
  }
  process.exit(0)
}

// Prefer the domain property if the account can see it, else URL-prefix.
const sites = await api(token, "/sites")
const entry =
  sites.siteEntry?.find((s) => s.siteUrl.startsWith("sc-domain:")) ??
  sites.siteEntry?.[0]
if (!entry) {
  console.error("NO_SITES — grant the service account access in Search Console first.")
  process.exit(1)
}

const dimensions =
  mode === "querypage" ? ["query", "page"] : mode === "page" ? ["page"] : ["query"]

const data = await api(
  token,
  `/sites/${encodeURIComponent(entry.siteUrl)}/searchAnalytics/query`,
  {
    startDate: dateNDaysAgo(days),
    endDate: dateNDaysAgo(0),
    dimensions,
    rowLimit,
  }
)

console.log(`# property: ${entry.siteUrl}  window: ${dateNDaysAgo(days)}..${dateNDaysAgo(0)}`)
console.log([...dimensions, "clicks", "impressions", "ctr", "position"].join("\t"))
for (const row of data.rows ?? []) {
  console.log(
    [
      ...row.keys,
      row.clicks,
      row.impressions,
      (row.ctr * 100).toFixed(1) + "%",
      row.position.toFixed(1),
    ].join("\t")
  )
}
if (!data.rows?.length) console.log("(no rows in window)")
