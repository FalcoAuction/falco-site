// Registry of the county pages that exist. The index page + sitemap
// read from this so adding a county is a one-line change here plus the
// page file. Kept as plain data (no JSX) so it is importable anywhere.
export const COUNTIES: Array<{ slug: string; county: string; seat: string }> = [
  { slug: "davidson-county", county: "Davidson", seat: "Nashville" },
  { slug: "shelby-county", county: "Shelby", seat: "Memphis" },
  { slug: "knox-county", county: "Knox", seat: "Knoxville" },
  { slug: "hamilton-county", county: "Hamilton", seat: "Chattanooga" },
  { slug: "rutherford-county", county: "Rutherford", seat: "Murfreesboro" },
  { slug: "williamson-county", county: "Williamson", seat: "Franklin" },
  { slug: "montgomery-county", county: "Montgomery", seat: "Clarksville" },
  { slug: "sumner-county", county: "Sumner", seat: "Gallatin" },
  { slug: "wilson-county", county: "Wilson", seat: "Lebanon" },
  { slug: "maury-county", county: "Maury", seat: "Columbia" },
  { slug: "robertson-county", county: "Robertson", seat: "Springfield" },
  { slug: "cheatham-county", county: "Cheatham", seat: "Ashland City" },
  { slug: "dickson-county", county: "Dickson", seat: "Dickson" },
  { slug: "sevier-county", county: "Sevier", seat: "Sevierville" },
  { slug: "washington-county", county: "Washington", seat: "Johnson City" },
  { slug: "blount-county", county: "Blount", seat: "Maryville" },
  { slug: "madison-county", county: "Madison", seat: "Jackson" },
  { slug: "sullivan-county", county: "Sullivan", seat: "Blountville" },
  { slug: "bradley-county", county: "Bradley", seat: "Cleveland" },
  { slug: "putnam-county", county: "Putnam", seat: "Cookeville" },
]
