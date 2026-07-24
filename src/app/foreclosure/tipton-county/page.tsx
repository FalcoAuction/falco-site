import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "tipton-county",
  county: "Tipton",
  seat: "Covington",
  towns: ["Covington", "Atoka", "Brighton", "Munford", "Mason"],
  saleLocation:
    "the front door of the Tipton County Courthouse at 100 Court Square in Covington (some notices instead designate the north door, or the Chancery Courthouse on South College Street)",
  courthouseName: "Tipton County Courthouse",
  courthouseAddress: "100 Court Square, Covington, TN 38019",
  saleLocationCite:
    "https://covingtonleader.com/news/public-records/successor-trustees-notice-of-sale/",
  noticePublications: ["The Leader (Covington)"],
  noticeCite:
    "https://covingtonleader.com/legal-notices/substitute-trustees-notice-of-foreclosure-sale-2/",
  clerkAndMaster: "Tipton County Clerk & Master, (901) 476-0209",
  clerkAndMasterUrl: "https://tiptonco.com/government/courts/chancery/index.php",
  registerOfDeeds: "Tipton County Register of Deeds, (901) 476-0204",
  registerOfDeedsUrl: "https://tiptonco.com/government/register_of_deeds/index.php",
  officesCite: "https://tiptonco.com/government/register_of_deeds/index.php",
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
