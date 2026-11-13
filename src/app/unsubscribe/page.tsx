// Confirm page for outreach unsubscribe links. A GET never unsubscribes
// (link scanners prefetch URLs); the button POSTs to /api/outreach/unsubscribe.

import { verifyUnsubscribeToken } from "@/lib/outreach"
import { SitePage } from "@/app/v2/site-page"

export const dynamic = "force-dynamic"
export const metadata = { title: "Unsubscribe · FALCO", robots: "noindex, nofollow" }

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams
  let email: string | null = null
  try {
    email = t ? verifyUnsubscribeToken(t, process.env) : null
  } catch {
    email = null
  }
  return (
    <SitePage>
      <div className="wrap pg-head" style={{ maxWidth: 640 }}>
        <p className="lbl">Email preferences</p>
        {done ? (
          <>
            <h1 className="d2">You are unsubscribed.</h1>
            <p className="lede" style={{ marginTop: 16 }}>You will not receive further outreach email from FALCO.</p>
          </>
        ) : email ? (
          <>
            <h1 className="d2">Unsubscribe</h1>
            <p className="lede" style={{ marginTop: 16 }}>Stop all outreach email from FALCO to {email}.</p>
            <form method="post" action="/api/outreach/unsubscribe" style={{ marginTop: 28 }}>
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="pill dark">
                Unsubscribe
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="d2">Link not valid</h1>
            <p className="lede" style={{ marginTop: 16 }}>
              This unsubscribe link is incomplete. Reply to any FALCO email with &quot;unsubscribe&quot; and we will remove you.
            </p>
          </>
        )}
      </div>
    </SitePage>
  )
}
