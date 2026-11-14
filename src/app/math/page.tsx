import MathContent from "./math-content"
import { ogMeta } from "@/lib/og"

export const metadata = {
  title: "The Math: Forced Sale vs Cash Offer vs Marketed Auction | FALCO",
  description:
    "One Tennessee house, three ways out. What a forced sale, a cash offer and a marketed auction would each leave you, with the sources behind every number.",
  alternates: { canonical: "/math" },
  ...ogMeta({
    key: "math",
    title: "The Math: Forced Sale vs Cash Offer vs Marketed Auction | FALCO",
    description:
      "One Tennessee house, three ways out. What a forced sale, a cash offer and a marketed auction would each leave you, with the sources behind every number.",
    path: "/math",
  }),
}

export default function MathPage() {
  return <MathContent />
}
