// Confirm page for outreach unsubscribe links. A GET never unsubscribes
// (link scanners prefetch URLs); the button POSTs to /api/outreach/unsubscribe.

import { verifyUnsubscribeToken } from "@/lib/outreach"

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
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">FALCO</div>
        {done ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">You are unsubscribed</h1>
            <p className="mt-2 text-sm text-white/60">You will not receive further outreach email from FALCO.</p>
          </>
        ) : email ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">Unsubscribe</h1>
            <p className="mt-2 text-sm text-white/60">Stop all outreach email from FALCO to {email}.</p>
            <form method="post" action="/api/outreach/unsubscribe" className="mt-6">
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-emerald-400">
                Unsubscribe
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold">Link not valid</h1>
            <p className="mt-2 text-sm text-white/60">
              This unsubscribe link is incomplete. Reply to any FALCO email with &quot;unsubscribe&quot; and we will remove you.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
