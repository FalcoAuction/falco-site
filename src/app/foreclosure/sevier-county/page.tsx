import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "sevier-county",
  county: "Sevier",
  seat: "Sevierville",
  towns: ["Sevierville", "Pigeon Forge", "Gatlinburg", "Seymour"],
  saleLocation: "the front entrance of the Sevier County Courthouse in Sevierville",
  courthouseName: "Sevier County Courthouse",
  courthouseAddress: "125 Court Avenue, Sevierville, TN 37862",
  saleTime: "commonly midday (around noon to 2 p.m.), varying by notice",
  saleLocationCite:
    "https://www.themountainpress.com/classifieds/community/announcements/legal/",
  noticePublications: ["The Mountain Press"],
  noticeCite: "https://www.themountainpress.com/classifieds/",
  clerkAndMaster: "Sevier County Clerk & Master, (865) 453-4654",
  clerkAndMasterUrl: "https://www.seviercountytn.gov/government/county_officials/clerk___master.php",
  registerOfDeeds: "Sevier County Register of Deeds, (865) 453-2758",
  registerOfDeedsUrl: "https://www.seviercountytn.gov/government/county_officials/register_of_deeds.php",
  officesCite: "https://www.seviercountytn.gov/government/county_officials/clerk___master.php",
  // Median value deliberately omitted: Sevier's county median is heavily
  // inflated and volatile due to the Smokies cabin / short-term-rental
  // market, so it would misrepresent a typical primary residence.
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
