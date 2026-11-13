import InquiryForm from "./inquiry-form"
import { ogMeta } from "@/lib/og"

export const metadata = {
  title: "Contact FALCO | Tennessee",
  description:
    "Don't fit the homeowner, buyer, or auction-company forms? Drop us a note and we'll get back within one business day.",
  alternates: { canonical: "/inquiry" },
  ...ogMeta({
    key: "inquiry",
    title: "Contact FALCO | Tennessee",
    description: "Don't fit the homeowner, buyer, or auction-company forms? Drop us a note and we'll get back within one business day.",
    path: "/inquiry",
  }),
}

export default function InquiryPage() {
  return <InquiryForm />
}
