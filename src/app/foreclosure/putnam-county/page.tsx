import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "putnam-county",
  county: "Putnam",
  seat: "Cookeville",
  towns: ["Cookeville", "Algood", "Baxter", "Monterey"],
  saleLocation: "the front door of the Putnam County Courthouse in Cookeville",
  courthouseName: "Putnam County Courthouse",
  courthouseAddress: "421 East Spring Street, Cookeville, TN 38501",
  saleTime: "commonly in the morning, around 10 a.m., varying by notice",
  saleLocationCite: "https://www.tnpublicnotice.com/",
  noticePublications: ["Herald-Citizen"],
  noticeCite: "https://www.tnpublicnotice.com/",
  clerkAndMaster: "Putnam County Clerk & Master, (931) 526-6321",
  clerkAndMasterUrl: "https://putnamcountytn.gov/clerk-and-master",
  registerOfDeeds: "Putnam County Register of Deeds, (931) 526-7101",
  registerOfDeedsUrl: "https://putnamcountytn.gov/register-deeds",
  officesCite: "https://putnamcountytn.gov/clerk-and-master",
  medianValue: "$365,000",
  medianValueCite: "https://www.redfin.com/county/2615/TN/Putnam-County/housing-market",
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
