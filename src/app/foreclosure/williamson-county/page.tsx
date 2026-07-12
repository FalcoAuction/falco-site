import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "williamson-county",
  county: "Williamson",
  seat: "Franklin",
  towns: ["Franklin", "Brentwood", "Nolensville", "Thompson's Station", "Fairview"],
  // Exact door varies between notices; the "usual and customary location"
  // wording is the high-confidence version, so we use it rather than
  // asserting a specific door.
  saleLocation: "the usual and customary location at the Williamson County Courthouse in Franklin",
  courthouseName: "Williamson County Judicial Center",
  courthouseAddress: "135 4th Avenue South, Franklin, TN 37064",
  // Time varies widely (10 a.m. to 2 p.m.); omitted deliberately so the
  // page never states a time that could be wrong.
  saleLocationCite:
    "https://www.williamsonherald.com/classifieds/other/public_notices/",
  noticePublications: ["The Williamson Herald"],
  noticeCite: "https://www.williamsonherald.com/classifieds/other/public_notices/",
  clerkAndMaster: "Williamson County Clerk & Master, (615) 790-5428",
  clerkAndMasterUrl: "https://www.williamsoncounty-tn.gov/Directory.aspx?did=75",
  registerOfDeeds: "Williamson County Register of Deeds, (615) 790-5706",
  registerOfDeedsUrl: "https://www.williamsoncounty-tn.gov/directory.aspx?did=70",
  officesCite: "https://www.williamsoncounty-tn.gov/Directory.aspx?did=75",
  medianValue: "$975,000",
  medianValueCite: "https://www.redfin.com/county/2638/TN/Williamson-County/housing-market",
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
