import HomeownerForm from "./homeowner-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Free 15-min call · FALCO Tennessee",
  description:
    "Facing foreclosure in Tennessee? Get the math on what you'd actually walk away with through a marketed auction. Free, no pitch, real numbers within one business day.",
}

export default function HomeownersPage() {
  return <HomeownerForm />
}
