import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "greene-county",
  county: "Greene",
  seat: "Greeneville",
  towns: ["Greeneville", "Tusculum", "Mosheim", "Baileyton"],
  saleLocation:
    "the front door of the Greene County Courthouse at 101 South Main Street in Greeneville",
  courthouseName: "Greene County Courthouse",
  courthouseAddress: "101 South Main Street, Greeneville, TN 37743",
  saleLocationCite:
    "https://www.greenevillesun.com/classifieds/community/public_notices/substitute-trustees-notice-of-sale-sale/pdfdisplayad_7ca3a8e3-5776-55eb-a2cc-3b286f8c6396.html",
  noticePublications: ["The Greeneville Sun"],
  noticeCite: "https://www.greenevillesun.com/classifieds/community/public_notices/",
  clerkAndMaster: "Greene County Clerk & Master, (423) 798-1742",
  clerkAndMasterUrl: "https://www.greenecountytngov.com/clerk-master-office/",
  registerOfDeeds: "Greene County Register of Deeds, (423) 798-1726",
  registerOfDeedsUrl: "https://www.greenecountytngov.com/register-of-deeds/",
  officesCite: "https://www.greenecountytngov.com/clerk-master-office/",
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
