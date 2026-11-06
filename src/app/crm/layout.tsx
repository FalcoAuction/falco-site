// Root of /crm. Keeps the marketing display serif off every CRM screen
// (.falco-app in globals.css). Sign-in lives in /crm/login; everything
// behind it is in the (app) group, which checks the session. The math
// sheet sits outside (app) so it prints without the sidebar.
export const metadata = { title: "FALCO CRM", robots: "noindex, nofollow" }

export default function CrmRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="falco-app">{children}</div>
}
