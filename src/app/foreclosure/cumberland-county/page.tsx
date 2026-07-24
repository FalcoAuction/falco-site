import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "cumberland-county",
  county: "Cumberland",
  seat: "Crossville",
  towns: ["Crossville", "Fairfield Glade", "Crab Orchard", "Pleasant Hill", "Lake Tansi"],
  saleLocation:
    "the front door (Main Street entrance) of the historic Cumberland County Courthouse at 2 North Main Street in Crossville",
  courthouseName: "Cumberland County Courthouse",
  courthouseAddress: "2 North Main Street, Crossville, TN 38555",
  saleLocationCite:
    "https://marketplace.crossville-chronicle.com/crossville-tn/public-notices/notice-of-trustees-sale-noti/AC1E057E191a9004C2TYxi3DC608",
  noticePublications: ["Crossville Chronicle"],
  noticeCite: "https://marketplace.crossville-chronicle.com/crossville-tn/public-notices/",
  clerkAndMaster: "Cumberland County Clerk & Master, (931) 484-4731",
  clerkAndMasterUrl: "https://cumberlandcountytn.gov/directory/clerk-master/",
  registerOfDeeds: "Cumberland County Register of Deeds, (931) 484-5559",
  registerOfDeedsUrl: "https://cumberlandcountytn.gov/directory/register-of-deeds/",
  officesCite: "https://cumberlandcountytn.gov/directory/",
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
