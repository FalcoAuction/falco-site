import HomeownerForm from "./homeowner-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Stop Losing Your Equity to Foreclosure in Tennessee | FALCO",
  description:
    "Facing foreclosure in Tennessee? You can still sell before the trustee sale and keep your equity. Free 15-minute call, real numbers, no cost to you.",
}

export default function HomeownersPage() {
  return <HomeownerForm />
}
