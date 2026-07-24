import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "hawkins-county",
  county: "Hawkins",
  seat: "Rogersville",
  towns: ["Rogersville", "Church Hill", "Mount Carmel", "Surgoinsville", "Bulls Gap"],
  saleLocation:
    "the main entrance of the Hawkins County Courthouse at 100 East Main Street in Rogersville",
  courthouseName: "Hawkins County Courthouse",
  courthouseAddress: "100 East Main Street, Rogersville, TN 37857",
  saleTime: "around 11:00 a.m.",
  saleLocationCite:
    "https://www.therogersvillereview.com/classifieds/community/public_notices/pdfdisplayad_e637a0c1-e580-5343-af3e-4c379fd5e77e.html",
  noticePublications: ["The Rogersville Review"],
  noticeCite:
    "https://www.therogersvillereview.com/classifieds/community/public_notices/pdfdisplayad_e637a0c1-e580-5343-af3e-4c379fd5e77e.html",
  clerkAndMaster: "Hawkins County Clerk & Master, (423) 272-8150",
  clerkAndMasterUrl: "https://www.hawkinscountytn.gov/chancery_court_clerk_master.html",
  registerOfDeeds: "Hawkins County Register of Deeds, (423) 272-8304",
  registerOfDeedsUrl: "https://www.hawkinscountytn.gov/register_of_deeds.html",
  officesCite: "https://www.hawkinscountytn.gov/chancery_court_clerk_master.html",
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
