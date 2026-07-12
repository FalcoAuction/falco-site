import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "wilson-county",
  county: "Wilson",
  seat: "Lebanon",
  towns: ["Lebanon", "Mt. Juliet", "Watertown"],
  saleLocation: "the front door of the Wilson County Courthouse, fronting East Main Street in Lebanon",
  courthouseName: "Wilson County Courthouse",
  courthouseAddress: "228 East Main Street, Lebanon, TN 37087",
  saleTime: "commonly at noon, though the hour varies by notice",
  saleLocationCite:
    "https://mainstreetmediatn.com/articles/public-notices-thewilsonpost/public-notices-week-of-august-14-2024-2/",
  noticePublications: ["The Wilson Post"],
  noticeCite: "https://wilsonpost.com/public_notices/",
  clerkAndMaster: "Wilson County Clerk & Master, (615) 444-2835",
  clerkAndMasterUrl: "https://wilsoncountytn.gov/173/Clerk-Master",
  registerOfDeeds: "Wilson County Register of Deeds, (615) 443-2611",
  registerOfDeedsUrl: "https://www.wilsondeeds.com/",
  officesCite: "https://wilsoncountytn.gov/173/Clerk-Master",
  medianValue: "$499,000",
  medianValueCite: "https://www.redfin.com/county/2639/TN/Wilson-County/housing-market",
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
