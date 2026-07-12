import { CountyPage, CountyJsonLd, countyMetadata, type CountyData } from "../county-template"

const DATA: CountyData = {
  slug: "maury-county",
  county: "Maury",
  seat: "Columbia",
  towns: ["Columbia", "Spring Hill", "Mount Pleasant", "Culleoka"],
  // Trustee sales are still held at the HISTORIC Public Square courthouse,
  // not the new Judicial Center on S. Main that opened in 2024. Verified
  // against current notices; do not use the S. Main address here.
  saleLocation: "the historic Maury County Courthouse on the Public Square in Columbia",
  courthouseName: "Maury County Courthouse (Public Square)",
  courthouseAddress: "Public Square, Columbia, TN 38401",
  saleTime: "commonly at or about 11:00 a.m.",
  saleLocationCite:
    "https://mainstreetmediatn.com/articles/bargainbrowser/public-notices-week-of-june-24-2026-3/",
  noticePublications: ["Main Street Maury"],
  noticeCite: "https://www.tnpublicnotice.com/",
  // Two conflicting phone listings for the Clerk & Master surfaced in
  // research; phone omitted deliberately, the official page carries it.
  clerkAndMaster: "Maury County Clerk & Master (Chancery Court)",
  clerkAndMasterUrl: "https://www.maurycounty-tn.gov/210/Clerk-Master",
  registerOfDeeds: "Maury County Register of Deeds, (931) 375-2101",
  registerOfDeedsUrl: "https://www.maurycounty-tn.gov/155/Register-of-Deeds",
  officesCite: "https://www.maurycounty-tn.gov/210/Clerk-Master",
  medianValue: "$439,000",
  medianValueCite: "https://www.redfin.com/county/2604/TN/Maury-County/housing-market",
  monitored: true,
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
