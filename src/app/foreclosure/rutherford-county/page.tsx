import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "rutherford-county",
  county: "Rutherford",
  seat: "Murfreesboro",
  towns: ["Murfreesboro", "Smyrna", "La Vergne", "Eagleville"],
  saleLocation: "the east front door of the Rutherford County Courthouse on the downtown square",
  courthouseName: "Rutherford County Courthouse",
  courthouseAddress: "20 Public Square North, Murfreesboro, TN 37130",
  saleTime: "at 10:00 a.m., though individual notices sometimes set a later hour",
  saleLocationCite:
    "https://mainstreetmediatn.com/articles/murfreesboropost/legal-and-public-notices-4-13-15-notice-of-substitute-trustees-sales-trustees-sale-notice-of-foreclosure-sheriff-sale/",
  noticePublications: ["The Murfreesboro Post"],
  noticeCite: "https://mainstreetmediatn.com/articles/murfreesboropost/",
  clerkAndMaster: "Rutherford County Clerk & Master, (615) 898-7860",
  clerkAndMasterUrl: "https://rcchancery.com/contact",
  registerOfDeeds: "Rutherford County Register of Deeds, (615) 898-7870",
  registerOfDeedsUrl: "https://rutherfordcountytn.gov/register-deeds",
  officesCite: "https://rutherfordcountytn.gov/register-deeds",
  medianValue: "$425,000",
  medianValueCite: "https://www.redfin.com/county/2619/TN/Rutherford-County/housing-market",
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
