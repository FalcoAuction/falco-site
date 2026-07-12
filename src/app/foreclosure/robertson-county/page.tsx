import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "robertson-county",
  county: "Robertson",
  seat: "Springfield",
  towns: ["Springfield", "Greenbrier", "White House", "Cross Plains", "Adams"],
  saleLocation: "the West Door of the Robertson County Courthouse in Springfield (some notices use the Front Door)",
  courthouseName: "Robertson County Courthouse",
  courthouseAddress: "501 South Main Street, Springfield, TN 37172",
  saleTime: "commonly late morning to early afternoon (around 11 a.m. to 2 p.m., often noon), varying by notice",
  saleLocationCite: "https://mainstreetmediatn.com/articles/bargainbrowser/public-notices-week-of-july-1-2025-2/",
  noticePublications: ["Robertson County Connection"],
  noticeCite: "https://www.tnpublicnotice.com/",
  clerkAndMaster: "Robertson County Clerk & Master, (615) 384-5650",
  clerkAndMasterUrl: "https://robertsoncountytn.gov/departments/clerk_and_master/index.php",
  registerOfDeeds: "Robertson County Register of Deeds, (615) 384-3772",
  registerOfDeedsUrl: "https://www.robertsoncountytn.gov/local_government/register_of_deeds/index.php",
  officesCite: "https://robertsoncountytn.gov/departments/clerk_and_master/index.php",
  medianValue: "$365,000",
  medianValueCite: "https://www.redfin.com/county/2618/TN/Robertson-County/housing-market",
  monitored: true,
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
