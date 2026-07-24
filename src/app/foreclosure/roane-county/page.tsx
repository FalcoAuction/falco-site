import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "roane-county",
  county: "Roane",
  seat: "Kingston",
  towns: ["Kingston", "Harriman", "Rockwood", "Oliver Springs"],
  saleLocation:
    "the main entry door from the parking area of the Roane County Courthouse at 200 East Race Street in Kingston",
  courthouseName: "Roane County Courthouse",
  courthouseAddress: "200 East Race Street, Kingston, TN 37763",
  saleTime: "around 10:00 a.m.",
  saleLocationCite:
    "https://www.themountainpress.com/roane/classifieds/community/announcements/legal/trustees-notice-of-sale-of-real-estate-and-affixed-manufactured-home-anthony-r/ad_2064732a-01b6-5c48-b2f0-e42623aca835.html",
  noticePublications: ["Roane County News"],
  noticeCite: "https://www.themountainpress.com/roane/",
  clerkAndMaster: "Roane County Clerk & Master, (865) 376-2487",
  clerkAndMasterUrl: "https://roanecountytn.gov/clerk-and-master/",
  registerOfDeeds: "Roane County Register of Deeds, (865) 376-4673",
  registerOfDeedsUrl: "https://roanecountytn.gov/register-of-deeds/",
  officesCite: "https://roanecountytn.gov/clerk-and-master/",
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
