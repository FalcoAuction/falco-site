import ProfessionalsContent from "./professionals-content"

export const metadata = {
  title: "For Estate Attorneys, Trustees and Receivers in Tennessee | FALCO",
  description:
    "One contact for every asset in an estate, bankruptcy or receivership. FALCO inventories, routes each asset to a licensed Tennessee auctioneer, and delivers a sale record for the file.",
  alternates: { canonical: "/professionals" },
}

export default function ProfessionalsPage() {
  return <ProfessionalsContent />
}
