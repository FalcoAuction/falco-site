import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "jefferson-county",
  county: "Jefferson",
  seat: "Dandridge",
  towns: ["Dandridge", "Jefferson City", "White Pine", "New Market", "Baneberry"],
  saleLocation:
    "the main entrance of the Jefferson County Courthouse at 202 West Main Street in Dandridge",
  courthouseName: "Jefferson County Courthouse",
  courthouseAddress: "202 West Main Street, Dandridge, TN 37725",
  saleLocationCite:
    "https://www.standardbanner.com/articles/public-notices/thursday-may-21-2026/",
  noticePublications: ["The Standard Banner", "The Jefferson County Post"],
  noticeCite: "https://jeffersoncountypost.com/?p=61476",
  clerkAndMaster: "Jefferson County Clerk & Master, (865) 397-2404",
  clerkAndMasterUrl: "https://jeffersoncountytn.gov/chancery-court/",
  registerOfDeeds: "Jefferson County Register of Deeds, (865) 397-2918",
  registerOfDeedsUrl: "https://jeffersoncountytn.gov/register-of-deeds/",
  officesCite: "https://jeffersoncountytn.gov/register-of-deeds/",
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
