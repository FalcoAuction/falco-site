import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "madison-county",
  county: "Madison",
  seat: "Jackson",
  towns: ["Jackson", "Three Way", "Bemis", "Malesus"],
  saleLocation: "the north door of the Madison County Courthouse in Jackson",
  courthouseName: "Madison County Courthouse",
  courthouseAddress: "100 East Main Street, Jackson, TN 38301",
  saleTime: "commonly late morning (around 11 a.m.), varying by notice",
  saleLocationCite: "https://www.tnpublicnotice.com/",
  noticePublications: ["The Jackson Sun"],
  noticeCite: "https://tnpress.com/directory/the-jackson-sun/",
  clerkAndMaster: "Madison County Clerk & Master, (731) 423-6030",
  clerkAndMasterUrl: "https://madisoncountychancery.com/",
  registerOfDeeds: "Madison County Register of Deeds, (731) 423-6028",
  registerOfDeedsUrl: "https://www.madisoncountytn.gov/Directory/Home/DepartmentListing?DID=10",
  officesCite: "https://madisoncountychancery.com/",
  medianValue: "$255,000",
  medianValueCite: "https://www.redfin.com/county/2601/TN/Madison-County/housing-market",
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
