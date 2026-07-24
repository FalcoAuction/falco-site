import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "mcminn-county",
  county: "McMinn",
  seat: "Athens",
  towns: ["Athens", "Etowah", "Niota", "Sweetwater", "Calhoun", "Englewood"],
  saleLocation:
    "the front door of the McMinn County Courthouse at 6 East Madison Avenue in Athens",
  courthouseName: "McMinn County Courthouse",
  courthouseAddress: "6 East Madison Avenue, Athens, TN 37303",
  saleLocationCite:
    "https://www.dailypostathenian.com/classifieds/community/public_notices/pdfdisplayad_0b305208-2642-5238-879e-017024e02dd0.html",
  noticePublications: ["Daily Post-Athenian"],
  noticeCite:
    "https://www.dailypostathenian.com/classifieds/community/public_notices/pdfdisplayad_0b305208-2642-5238-879e-017024e02dd0.html",
  clerkAndMaster: "McMinn County Clerk & Master, (423) 745-1281",
  clerkAndMasterUrl: "https://www.mcminncountytn.gov/clerk_master.html",
  registerOfDeeds: "McMinn County Register of Deeds, (423) 745-1232",
  registerOfDeedsUrl: "https://www.mcminncountytn.gov/register_of_deeds.html",
  officesCite: "https://www.mcminncountytn.gov/clerk_master.html",
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
