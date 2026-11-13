import { redirect } from "next/navigation"

// The old email-only intake. /start is the one intake for every
// situation now, so send anyone with an old link there.
export default function SubmitOpportunityPage() {
  redirect("/start")
}
