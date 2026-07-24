import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "hamblen-county",
  county: "Hamblen",
  seat: "Morristown",
  towns: ["Morristown", "Russellville", "Talbott", "Whitesburg", "Lowland"],
  saleLocation:
    "the north door of the Hamblen County Courthouse at 511 West 2nd North Street in Morristown",
  courthouseName: "Hamblen County Courthouse",
  courthouseAddress: "511 West 2nd North Street, Morristown, TN 37814",
  saleLocationCite:
    "https://www.citizentribune.com/classifieds/public_notices/trustees-sale-ts-2025-18591-tn/ad_285fe365-252e-5ddb-ae17-a3d25982029f.html",
  noticePublications: ["Citizen Tribune"],
  noticeCite:
    "https://www.citizentribune.com/classifieds/public_notices/trustees-sale-ts-2025-18591-tn/ad_285fe365-252e-5ddb-ae17-a3d25982029f.html",
  clerkAndMaster: "Hamblen County Clerk & Master, (423) 586-9112",
  clerkAndMasterUrl: "https://www.hamblencountytn.gov/elected-officials-department-heads-directory/",
  registerOfDeeds: "Hamblen County Register of Deeds, (423) 586-6551",
  registerOfDeedsUrl: "https://www.hamblencountytn.gov/register-of-deeds/",
  officesCite: "https://www.hamblencountytn.gov/elected-officials-department-heads-directory/",
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
