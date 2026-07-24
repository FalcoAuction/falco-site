import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "anderson-county",
  county: "Anderson",
  seat: "Clinton",
  towns: ["Oak Ridge", "Clinton", "Norris", "Rocky Top", "Oliver Springs"],
  saleLocation:
    "the front entrance of the Anderson County Courthouse at 100 North Main Street in Clinton",
  courthouseName: "Anderson County Courthouse",
  courthouseAddress: "100 North Main Street, Clinton, TN 37716",
  saleLocationCite: "https://andersoncountyclerkandmaster.com/contact/",
  noticePublications: ["The Courier News (Clinton)"],
  noticeCite: "https://www.mycouriernews.com/pages/publicnotices",
  clerkAndMaster: "Anderson County Clerk & Master, (865) 457-6205",
  clerkAndMasterUrl: "https://andersoncountyclerkandmaster.com/contact/",
  registerOfDeeds: "Anderson County Register of Deeds, (865) 457-6235",
  registerOfDeedsUrl: "https://andersoncountytn.gov/register-of-deeds/",
  officesCite: "https://andersoncountyclerkandmaster.com/contact/",
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
