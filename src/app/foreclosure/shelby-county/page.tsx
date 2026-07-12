import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "shelby-county",
  county: "Shelby",
  seat: "Memphis",
  towns: ["Memphis", "Bartlett", "Germantown", "Collierville", "Millington"],
  saleLocation: "the southwest door of the Shelby County Courthouse at 140 Adams Avenue in Memphis",
  courthouseName: "Shelby County Courthouse",
  courthouseAddress: "140 Adams Avenue, Memphis, TN 38103",
  saleTime: "at or about 10:00 a.m.",
  saleLocationCite: "https://www.sissmanlaw.com/foreclosure-defense/tennessee-foreclosure-law/",
  noticePublications: ["The Daily News (Memphis)"],
  noticeCite: "https://www.memphisdailynews.com/Notices.aspx",
  // Shelby's Clerk & Master publishes an excess-proceeds FAQ + claim
  // process online.
  clerkAndMaster: "Shelby County Clerk & Master (excess proceeds), (901) 222-3900",
  clerkAndMasterUrl: "https://www.shelbycountytn.gov/332/The-Clerk-Master",
  registerOfDeeds: "Shelby County Register of Deeds, (901) 222-8100",
  registerOfDeedsUrl: "https://register.shelby.tn.us/",
  officesCite: "https://www.shelbycountytn.gov/332/The-Clerk-Master",
  medianValue: "$295,000",
  medianValueCite: "https://www.redfin.com/county/2623/TN/Shelby-County/housing-market",
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
