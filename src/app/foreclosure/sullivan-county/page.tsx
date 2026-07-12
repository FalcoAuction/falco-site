import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "sullivan-county",
  county: "Sullivan",
  seat: "Blountville",
  towns: ["Blountville", "Kingsport", "Bristol", "Bluff City"],
  saleLocation: "the usual and customary location at the Sullivan County Courthouse in Blountville",
  courthouseName: "Sullivan County Courthouse",
  courthouseAddress: "3411 Highway 126, Blountville, TN 37617",
  saleTime: "commonly late morning to early afternoon (around 10 a.m. to 2 p.m.), varying by notice",
  saleLocationCite:
    "https://www.timesnews.net/classifieds/community/legal_notices/",
  noticePublications: ["Kingsport Times-News", "Bristol Herald Courier"],
  noticeCite: "https://www.timesnews.net/classifieds/community/legal_notices/",
  clerkAndMaster: "Sullivan County Clerk & Master, (423) 323-6483",
  clerkAndMasterUrl: "https://sullivancountytn.gov/chancery-court/",
  registerOfDeeds: "Sullivan County Register of Deeds, (423) 323-6420",
  registerOfDeedsUrl: "https://sullivancountytn.gov/register-of-deeds/",
  officesCite: "https://sullivancountytn.gov/chancery-court/",
  medianValue: "$294,000",
  medianValueCite: "https://www.redfin.com/county/2626/TN/Sullivan-County/housing-market",
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
