import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "knox-county",
  county: "Knox",
  seat: "Knoxville",
  towns: ["Knoxville", "Farragut", "Powell", "Halls", "Karns"],
  saleLocation:
    "the front entrance of the Knox County City-County Building at 400 Main Street in Knoxville, near the Small Assembly Room",
  courthouseName: "Knox County City-County Building",
  courthouseAddress: "400 Main Street, Knoxville, TN 37902",
  saleTime: "mid-morning, around 10:00 to 10:30 a.m.",
  saleLocationCite:
    "https://www.knoxfocus.com/archives/public-notice/legal-and-public-notices-for-the-week-of-july-6-2026/",
  noticePublications: ["The Knoxville Focus", "Knoxville News Sentinel"],
  noticeCite: "https://www.knoxfocus.com/category/archives/public-notice/",
  clerkAndMaster: "Knox County Clerk & Master, (865) 215-2555",
  clerkAndMasterUrl: "https://knoxcounty.org/chancery/clerk_master.php",
  registerOfDeeds: "Knox County Register of Deeds, (865) 215-2330",
  registerOfDeedsUrl: "https://rod.knoxcounty.org/",
  officesCite: "https://knoxcounty.org/chancery/clerk_master.php",
  medianValue: "$391,000",
  medianValueCite: "https://www.redfin.com/county/2591/TN/Knox-County/housing-market",
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
