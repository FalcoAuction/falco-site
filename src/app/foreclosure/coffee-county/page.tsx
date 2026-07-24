import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "coffee-county",
  county: "Coffee",
  seat: "Manchester",
  towns: ["Manchester", "Tullahoma"],
  saleLocation:
    "the north door of the Coffee County Justice Center at 300 Hillsboro Boulevard in Manchester",
  courthouseName: "Coffee County Justice Center",
  courthouseAddress: "300 Hillsboro Boulevard, Manchester, TN 37355",
  saleTime: "around 11:00 a.m. local time",
  saleLocationCite:
    "https://capitalcitypostings.com/hubfs/Capital%20City%20Posting/CCP%20TN/26-001351_Substitute_Trustees_Notice_of_Sale_revised.pdf",
  noticePublications: ["The Tullahoma News", "The Manchester Times"],
  noticeCite: "https://www.tullahomanews.com/classifieds/public_notices/",
  clerkAndMaster: "Coffee County Clerk & Master, (931) 723-5132",
  clerkAndMasterUrl: "https://www.coffeecountytn.gov/Directory.aspx?did=14",
  registerOfDeeds: "Coffee County Register of Deeds, (931) 723-5130",
  registerOfDeedsUrl: "https://www.coffeecountyregisterofdeeds.com/contact-us/",
  officesCite: "https://www.coffeecountytn.gov/Directory.aspx?did=14",
  monitored: false,
}

export const metadata = countyMetadata(DATA)

export default function Page() {
  return (
    <>
      <CountyJsonLd d={DATA} />
      <CountyPage d={DATA} />
    </>
  )
}
