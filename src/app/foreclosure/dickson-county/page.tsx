import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

// ACCURACY NOTE: Dickson County's seat and courthouse are in CHARLOTTE,
// not the city of Dickson (the county's largest city). Trustee sales are
// held in Charlotte. seat is set to "Dickson" only for homeowner-facing
// phrasing (most residents are there); the sale location clearly states
// Charlotte so no one goes to the wrong town.
const DATA: CountyData = {
  slug: "dickson-county",
  county: "Dickson",
  seat: "Dickson",
  towns: ["Dickson", "Charlotte", "Burns", "White Bluff"],
  saleLocation:
    "the front door of the main Dickson County Courthouse on the Public Square in Charlotte (the county seat), not in the city of Dickson",
  courthouseName: "Dickson County Courthouse (Charlotte)",
  courthouseAddress: "Public Square, Charlotte, TN 37036",
  saleTime: "commonly late morning to early afternoon (around 11 a.m. to 2 p.m.), varying by notice",
  saleLocationCite: "https://mainstreetmediatn.com/articles/bargainbrowser/public-notices-week-of-june-24-2026-4/",
  noticePublications: ["The Dickson Herald", "Dickson Post"],
  noticeCite: "https://tnpress.com/directory/the-dickson-herald/",
  clerkAndMaster: "Dickson County Clerk & Master, (615) 789-7011",
  clerkAndMasterUrl: "https://www.dicksoncountytn.gov/chancery_court.html",
  registerOfDeeds: "Dickson County Register of Deeds, (615) 789-5123",
  registerOfDeedsUrl: "https://www.dicksoncountytn.gov/",
  officesCite: "https://www.dicksoncountytn.gov/chancery_court.html",
  medianValue: "$360,000",
  medianValueCite: "https://www.redfin.com/county/2566/TN/Dickson-County/housing-market",
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
