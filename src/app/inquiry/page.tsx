import InquiryForm from "./inquiry-form"

export const metadata = {
  title: "General Inquiry · FALCO Tennessee",
  description:
    "Don't fit the homeowner, buyer, or auction-company forms? Drop us a note and we'll get back within one business day.",
  alternates: { canonical: "/inquiry" },
}

export default function InquiryPage() {
  return <InquiryForm />
}
