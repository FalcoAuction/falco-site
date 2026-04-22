import InquiryForm from "./inquiry-form"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "General Inquiry · FALCO Tennessee",
  description:
    "Don't fit the homeowner, buyer, or auction-company forms? Drop us a note and we'll get back within one business day.",
}

export default function InquiryPage() {
  return <InquiryForm />
}
