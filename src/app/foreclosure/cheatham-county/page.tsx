import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "cheatham-county",
  county: "Cheatham",
  seat: "Ashland City",
  towns: ["Ashland City", "Kingston Springs", "Pegram", "Pleasant View"],
  saleLocation: "the front door of the Cheatham County Courthouse on the Public Square in Ashland City",
  courthouseName: "Cheatham County Courthouse",
  courthouseAddress: "100 Public Square, Ashland City, TN 37015",
  saleTime: "commonly late morning to early afternoon (around 11 a.m. to 1 p.m.), varying by notice",
  saleLocationCite: "https://mainstreetmediatn.com/articles/bargainbrowser/public-notices-week-of-july-1-2025-5/",
  noticePublications: ["Ashland City Times", "Cheatham County Exchange"],
  noticeCite: "https://mainstreetmediatn.com/category/cheathamcountyexchange/public-notices/",
  clerkAndMaster: "Cheatham County Clerk & Master, (615) 792-4620",
  clerkAndMasterUrl: "https://www.cheathamcountytn.gov/court_chancery.html",
  registerOfDeeds: "Cheatham County Register of Deeds, (615) 792-4317",
  registerOfDeedsUrl: "https://www.cheathamcountytn.gov/register_of_deeds.html",
  officesCite: "https://www.cheathamcountytn.gov/court_chancery.html",
  medianValue: "$435,000",
  medianValueCite: "https://www.redfin.com/county/2555/TN/Cheatham-County/housing-market",
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
