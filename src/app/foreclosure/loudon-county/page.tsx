import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "loudon-county",
  county: "Loudon",
  seat: "Loudon",
  towns: ["Lenoir City", "Loudon", "Greenback", "Philadelphia"],
  saleLocation:
    "the Loudon County Annex Building at 101 Mulberry Street in Loudon (this is the verified sale venue, not the historic courthouse on Grove Street)",
  courthouseName: "Loudon County Annex Building",
  courthouseAddress: "101 Mulberry Street, Loudon, TN 37774",
  saleTime: "around 2:00 p.m.",
  saleLocationCite:
    "https://www.news-herald.net/classifieds/community/public_notices/notice-of-substitute-trustee-s/pdfdisplayad_d69812ae-c37c-5488-ba49-1894ba7562ec.html",
  noticePublications: ["News-Herald (Lenoir City)"],
  noticeCite:
    "https://www.news-herald.net/classifieds/community/public_notices/notice-of-substitute-trustee-s/pdfdisplayad_d69812ae-c37c-5488-ba49-1894ba7562ec.html",
  clerkAndMaster: "Loudon County Clerk & Master, (865) 458-2630",
  clerkAndMasterUrl: "https://www.loudoncountychancery.com/",
  registerOfDeeds: "Loudon County Register of Deeds, (865) 458-2605",
  registerOfDeedsUrl: "https://loudoncounty-tn.gov/register-of-deeds/",
  officesCite: "https://loudoncounty-tn.gov/register-of-deeds/",
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
