import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "hamilton-county",
  county: "Hamilton",
  seat: "Chattanooga",
  towns: ["Chattanooga", "East Ridge", "Red Bank", "Soddy-Daisy", "Signal Mountain"],
  saleLocation: "the west door of the Hamilton County Courthouse at 625 Georgia Avenue in Chattanooga",
  courthouseName: "Hamilton County Courthouse",
  courthouseAddress: "625 Georgia Avenue, Chattanooga, TN 37402",
  saleTime: "typically late morning to noon",
  saleLocationCite: "https://hamiltoncountyherald.com/PublicNotices.aspx",
  noticePublications: ["Hamilton County Herald", "Chattanooga Times Free Press"],
  noticeCite: "https://hamiltoncountyherald.com/PublicNotices.aspx",
  clerkAndMaster: "Hamilton County Clerk & Master (excess proceeds forms), (423) 209-6600",
  clerkAndMasterUrl: "https://www.hamiltontn.gov/Chancery_RulesFees.aspx",
  registerOfDeeds: "Hamilton County Register of Deeds, (423) 209-6560",
  registerOfDeedsUrl: "https://register.hamiltontn.gov/",
  officesCite: "https://www.hamiltontn.gov/Chancery_RulesFees.aspx",
  medianValue: "$375,000",
  medianValueCite: "https://www.redfin.com/county/2577/TN/Hamilton-County/housing-market",
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
