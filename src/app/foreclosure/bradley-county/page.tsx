import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "bradley-county",
  county: "Bradley",
  seat: "Cleveland",
  towns: ["Cleveland", "Charleston", "McDonald"],
  saleLocation: "the front door of the Bradley County Courthouse in Cleveland",
  courthouseName: "Bradley County Courthouse",
  courthouseAddress: "155 North Ocoee Street, Cleveland, TN 37311",
  saleTime: "commonly between 10 a.m. and 2:30 p.m., varying by notice",
  saleLocationCite: "https://www.clevelandbanner.com/classifieds/community/announcements/legal/",
  noticePublications: ["Cleveland Daily Banner"],
  noticeCite: "https://www.clevelandbanner.com/classifieds/community/announcements/legal/",
  // Phone numbers for these two offices came from a records aggregator
  // (not the official department page), so omitted; the county site
  // carries current contact details.
  clerkAndMaster: "Bradley County Clerk & Master (Chancery Court)",
  clerkAndMasterUrl: "https://bradleycountytn.gov/",
  registerOfDeeds: "Bradley County Register of Deeds",
  registerOfDeedsUrl: "https://bradleycountytn.gov/",
  officesCite: "https://bradleycountytn.gov/",
  medianValue: "$310,000",
  medianValueCite: "https://www.redfin.com/county/2550/TN/Bradley-County/housing-market",
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
