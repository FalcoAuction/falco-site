import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "washington-county",
  county: "Washington",
  // Seat is Jonesborough (courthouse), but Johnson City is the population
  // center homeowners search for. saleLocation makes the courthouse town
  // explicit.
  seat: "Johnson City",
  towns: ["Johnson City", "Jonesborough", "Gray", "Telford"],
  saleLocation: "the front door of the Washington County Courthouse in Jonesborough (the county seat)",
  courthouseName: "Washington County Courthouse (Historic Courthouse)",
  courthouseAddress: "100 East Main Street, Jonesborough, TN 37659",
  saleTime: "commonly late morning (around 11 a.m.), varying by notice",
  saleLocationCite: "https://www.johnsoncitypress.com/classifieds/community/announcements/legal/",
  noticePublications: ["Johnson City Press"],
  noticeCite: "https://www.johnsoncitypress.com/classifieds/community/announcements/legal/",
  clerkAndMaster: "Washington County Clerk & Master, (423) 788-1450",
  clerkAndMasterUrl: "https://washingtoncountycourtsales.com/contact/",
  registerOfDeeds: "Washington County Register of Deeds, (423) 753-1644",
  registerOfDeedsUrl: "https://www.washingtoncountytn.org/230/Register-of-Deeds",
  officesCite: "https://www.washingtoncountytn.org/230/Register-of-Deeds",
  medianValue: "$370,000",
  medianValueCite: "https://www.redfin.com/county/2634/TN/Washington-County/housing-market",
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
