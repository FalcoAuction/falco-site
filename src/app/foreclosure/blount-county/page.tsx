import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "blount-county",
  county: "Blount",
  seat: "Maryville",
  towns: ["Maryville", "Alcoa", "Friendsville", "Townsend"],
  // Exact courthouse street number was medium-confidence in research, so
  // the address hedges to the street name; sales are at the courthouse on
  // Court Street, NOT the separate Justice Center on Lamar Alexander Pkwy.
  saleLocation: "the main entrance of the Blount County Courthouse on Court Street in Maryville",
  courthouseName: "Blount County Courthouse",
  courthouseAddress: "Court Street, Maryville, TN 37804",
  saleTime: "commonly early to mid afternoon (around 2 p.m.), varying by notice",
  saleLocationCite: "https://www.thedailytimes.com/classifieds/community/public_notices/",
  noticePublications: ["The Daily Times"],
  noticeCite: "https://www.thedailytimes.com/classifieds/community/public_notices/",
  clerkAndMaster: "Blount County Clerk & Master, (865) 273-5500",
  clerkAndMasterUrl: "https://www.blounttn.gov/308/Clerk-Masters-Office",
  registerOfDeeds: "Blount County Register of Deeds, (865) 273-5880",
  registerOfDeedsUrl: "https://www.blounttn.gov/321/Register-of-Deeds",
  officesCite: "https://www.blounttn.gov/308/Clerk-Masters-Office",
  medianValue: "$390,000",
  medianValueCite: "https://www.redfin.com/county/2549/TN/Blount-County/housing-market",
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
