import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "carter-county",
  county: "Carter",
  seat: "Elizabethton",
  towns: ["Elizabethton", "Watauga", "Roan Mountain", "Hampton"],
  saleLocation:
    "the front entrance of the Carter County Courthouse at 801 East Elk Avenue in Elizabethton",
  courthouseName: "Carter County Courthouse",
  courthouseAddress: "801 East Elk Avenue, Elizabethton, TN 37643",
  saleLocationCite: "https://www.tncourts.gov/node/9779773",
  noticePublications: ["Elizabethton Star", "Johnson City Press"],
  noticeCite: "https://elizabethton.com/services/contact-us/",
  clerkAndMaster: "Carter County Clerk & Master, (423) 542-1801",
  clerkAndMasterUrl:
    "https://www.cartercountytn.gov/government/elected_officials/clerk___master.php",
  registerOfDeeds: "Carter County Register of Deeds, (423) 542-1801",
  registerOfDeedsUrl:
    "https://www.cartercountytn.gov/government/elected_officials/register_of_deeds.php",
  officesCite:
    "https://www.cartercountytn.gov/government/elected_officials/clerk___master.php",
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
