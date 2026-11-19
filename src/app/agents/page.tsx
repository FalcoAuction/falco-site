import AgentsContent from "./agents-content"
import { ogMeta } from "@/lib/og"

const TITLE = "For Real Estate Agents: 1% on the Listings That Won't Sell | FALCO"
const DESCRIPTION =
  "Your broker is paid 1% of the winning bid at closing on the expireds, estates and foreclosure deadlines you send us. A licensed Tennessee auction firm sells it on a set date, and your seller pays no commission."

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/agents" },
  ...ogMeta({ key: "agents", title: TITLE, description: DESCRIPTION, path: "/agents" }),
}

export default function AgentsPage() {
  return <AgentsContent />
}
