import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "montgomery-county",
  county: "Montgomery",
  seat: "Clarksville",
  towns: ["Clarksville", "Woodlawn", "Cunningham", "Palmyra", "Southside"],
  saleLocation: "the front door of the Montgomery County Courthouse",
  courthouseName: "Montgomery County Courthouse",
  courthouseAddress: "2 Millennium Plaza, Clarksville, TN 37040",
  saleTime: "in the morning, commonly 10:00 or 11:00 a.m.",
  saleLocationCite:
    "https://mainstreetmediatn.com/articles/bargainbrowser/public-notices-week-of-june-4-2026-3/",
  noticePublications: ["The Leaf-Chronicle", "Main Street Clarksville"],
  noticeCite: "https://mainstreetmediatn.com/articles/bargainbrowser/public-notices-week-of-june-4-2026-3/",
  clerkAndMaster: "Montgomery County Clerk & Master, (931) 648-5703",
  clerkAndMasterUrl: "https://montgomerytn.gov/chancery",
  registerOfDeeds: "Montgomery County Register of Deeds, (931) 648-5713",
  registerOfDeedsUrl: "https://montgomerytn.gov/deeds",
  officesCite: "https://montgomerytn.gov/deeds",
  medianValue: "$344,000",
  medianValueCite: "https://www.redfin.com/county/2607/TN/Montgomery-County/housing-market",
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
