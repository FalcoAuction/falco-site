import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "sumner-county",
  county: "Sumner",
  seat: "Gallatin",
  towns: ["Gallatin", "Hendersonville", "Portland", "White House", "Westmoreland"],
  saleLocation: "the front door of the Sumner County Courthouse in Gallatin",
  courthouseName: "Sumner County Courthouse",
  courthouseAddress: "155 East Main Street, Gallatin, TN 37066",
  saleTime: "commonly in the early afternoon, often between 1:00 and 2:00 p.m.",
  saleLocationCite:
    "https://mainstreetmediatn.com/articles/bargainbrowser/public-notices-week-of-february-26-2026/",
  noticePublications: ["The Gallatin News"],
  noticeCite: "https://mainstreetmediatn.com/category/gallatinnews/public-notices-gallatinnews/",
  clerkAndMaster: "Sumner County Clerk & Master, (615) 452-4282",
  clerkAndMasterUrl: "https://sumnerchancerycourt.com/contact/",
  registerOfDeeds: "Sumner County Register of Deeds, (615) 452-3892",
  registerOfDeedsUrl: "https://sumnercountytn.gov/departments/register-of-deeds/",
  officesCite: "https://sumnercountytn.gov/departments/register-of-deeds/",
  medianValue: "$442,000",
  medianValueCite: "https://www.redfin.com/county/2627/TN/Sumner-County/housing-market",
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
