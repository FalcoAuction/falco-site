import PartnerForm from "./partner-form"

export const metadata = {
  title: "Auction partners · FALCO Tennessee",
  description:
    "Run an auction company in Tennessee? FALCO supplies a steady flow of pre-qualified distressed inventory. Open a partnership conversation.",
  alternates: { canonical: "/partners" },
}

export default function PartnersPage() {
  return <PartnerForm />
}
