// Marks every /admin screen as an operational surface so globals.css can
// keep the marketing display serif off it (see .falco-app in globals.css).
// Admin had no layout of its own, so the site-wide h1/h2 serif rule was
// bleeding into the dashboard.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="falco-app">{children}</div>
}
