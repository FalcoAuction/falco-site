import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "davidson-county",
  county: "Davidson",
  seat: "Nashville",
  towns: ["Nashville", "Antioch", "Hermitage", "Madison", "Donelson"],
  saleLocation:
    "the front door of the Historic Davidson County Courthouse (the Metro Courthouse) at One Public Square in Nashville",
  courthouseName: "Historic Davidson County Courthouse (Metro Courthouse)",
  courthouseAddress: "One Public Square, Nashville, TN 37201",
  saleTime: "typically late morning to noon, often 10:00 a.m. or 12:00 p.m.",
  saleLocationCite:
    "https://mainstreetmediatn.com/articles/bargainbrowser/public-notices-week-of-march-5-2026-4/",
  noticePublications: ["The Nashville Ledger", "The Tennessean"],
  noticeCite: "https://foreclosuretennessee.com/",
  // Davidson's Clerk & Master publishes an actual "Motion to Claim
  // Excess Sale Proceeds" form online — link straight to it.
  clerkAndMaster: "Davidson County Clerk & Master (excess proceeds forms), (615) 862-5710",
  clerkAndMasterUrl: "https://chanceryclerkandmaster.nashville.gov/",
  registerOfDeeds: "Davidson County Register of Deeds, (615) 862-6790",
  registerOfDeedsUrl: "https://www.nashville.gov/departments/register-deeds",
  officesCite: "https://chanceryclerkandmaster.nashville.gov/",
  medianValue: "$470,000",
  medianValueCite: "https://www.redfin.com/county/2563/TN/Davidson-County/housing-market",
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
