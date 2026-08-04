/* Standalone door-knock math-sheet generator.
 *
 * Run: node scripts/gen-doorknock-pdf.cjs
 * Output: a single multi-page landscape PDF in C:\Users\patar\Downloads\
 *
 * Why a local script vs hitting the production endpoint: Vercel queue
 * was stuck and Patrick needed the PDF NOW for tomorrow's door-knock.
 * This generates 20 math sheets in one PDF without touching prod.
 *
 * Wholesale numbers are tuned per-lead to keep the take-home positive
 * (Math.max(0, ...)) while modeling realistic distressed cash-offer
 * spreads (45-72% of ARV). For leads where even 72% can't cover the
 * payoff, the wholesale take-home shows $0 with "wholesaler walks"
 * footer — auction is the only viable path on those.
 */

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ─────────────────────────── 20-lead door-knock list ─────────────────────
// 2026-05-13 route. Kniery (reinstated by Mr. Cooper) and Turley
// (under contract) excluded vs yesterday. Ordered clockwise to match
// today's Maps URLs: Hendersonville (north) -> Madison -> Hermitage ->
// Donelson -> Antioch -> 37217 -> 37211 -> inner Nashville -> Brentwood.
// Values sourced from route_today_check.sql @ 2026-05-13 14:48 UTC.
const LEADS = [
  // Hendersonville (north start)
  { addr: "168 Mockingbird Hill Rd, Hendersonville, TN 37075", owner: "Heather Godfrey",     sale: "2026-06-11", arv:  458900, payoff:  117731 },
  { addr: "105 Riverwood Dr, Hendersonville, TN 37075",        owner: "Jordan Kemp",         sale: "2026-05-14", arv:  380000, payoff:  194595 },
  // Madison loop (37115)
  { addr: "1056 Cheyenne Blvd, Madison, TN 37115",             owner: "Lane Simkins",        sale: "2026-05-29", arv:  315400, payoff:  262241 },
  { addr: "1258 Sioux Ter, Madison, TN 37115",                 owner: "Lawrence Marrs",      sale: "2026-06-16", arv:  341600, payoff:  146202 },
  { addr: "1124 Due West Ave N, Madison, TN 37115",            owner: "Rex Ray",             sale: "2026-05-14", arv:  349400, payoff:  146748 },
  { addr: "715 Oakdell Ave, Madison, TN 37115",                owner: "Ivalee Pitts",        sale: "2026-06-04", arv:  255100, payoff:  129654 },
  // Hermitage (37076)
  { addr: "2041 Elk Springs Dr, Hermitage, TN 37076",          owner: "Brenda North",        sale: "2026-05-14", arv:  574800, payoff:  241416 },
  { addr: "8223 Luree Ln, Hermitage, TN 37076",                owner: "Bridgette Leonard",   sale: "2026-06-11", arv:  322300, payoff:  135366 },
  // Donelson (37214)
  { addr: "4052 Windwood Ln, Nashville, TN 37214",             owner: "Miroslav Barnyashev", sale: "2026-05-22", arv:  934000, payoff:  208956 },
  // Antioch cluster (37013) — 5 stops
  { addr: "1204 Lakewalk Dr, Antioch, TN 37013",               owner: "Michael Boswell",     sale: "2026-05-14", arv:  286800, payoff:  120456 },
  { addr: "200 Oceanfront Cir S, Antioch, TN 37013",           owner: "Chivkeeb Yang",       sale: "2026-05-15", arv:  250600, payoff:  105252 },
  { addr: "3316 Calais Cir, Antioch, TN 37013",                owner: "Hermelando Solis",    sale: "2026-05-14", arv:  295600, payoff:  241778 },
  { addr: "1101 White Mountain Ln, Antioch, TN 37013",         owner: "Kamadi Camp",         sale: "2026-05-28", arv:  492800, payoff:  206976 },
  { addr: "5681 Dory Dr, Antioch, TN 37013",                   owner: "Terry Barnett",       sale: "2026-06-04", arv:  359300, payoff:  161112 },
  // 37217
  { addr: "901 Coarsey Dr, Nashville, TN 37217",               owner: "Andre Patterson",     sale: "2026-05-15", arv:  225200, payoff:   94584 },
  // 37211 — whales
  { addr: "532 Whispering Hills Dr, Nashville, TN 37211",      owner: "Maikel Ojeda",        sale: "2026-05-28", arv:  406700, payoff:  170814 },
  { addr: "15433 Old Hickory Blvd, Nashville, TN 37211",       owner: "Jared Green",         sale: "2026-05-28", arv:  986100, payoff:  364418 },
  // Inner Nashville
  { addr: "817 Joseph Avenue, Nashville, TN 37207",            owner: "Gertrude Collier",    sale: "2026-07-23", arv:  523000, payoff:   22400 },
  { addr: "508 B 36Th Ave N, Nashville, TN 37209",             owner: "Lee Molette",         sale: "2026-05-19", arv:  728800, payoff:  199248 },
  // Brentwood whale (close out)
  { addr: "295 Jones Pkwy, Brentwood, TN 37027",               owner: "Robert Beckham",      sale: "2026-05-20", arv: 3553400, payoff: 2443040 },
];

// ────────────────────────────── helpers ──────────────────────────────────

function fmt(n) {
  if (!Number.isFinite(n)) return "-";
  // Always full currency at the sheet level so homeowner sees real dollars.
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Compact for tight columns: $1.5M, $322K, $5K. Used in Path 3 numeric
// ranges where full-format strings would overflow the value column.
function fmtCompact(n) {
  if (!Number.isFinite(n)) return "-";
  if (Math.abs(n) >= 1_000_000) {
    return "$" + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  }
  if (Math.abs(n) >= 1_000) {
    return "$" + Math.round(n / 1_000) + "K";
  }
  return "$" + Math.round(n);
}

function pickWholesalePct(arv, payoff) {
  // Pick the lowest wholesale percentage in [0.55, 0.72] that yields
  // a net take-home ≥ $20K. Models a realistic distressed cash offer
  // that still pencils above the loan payoff.
  const TARGET = 20000;
  if (arv <= 0) return 0.55;
  const requiredPct = (payoff + TARGET) / arv;
  if (requiredPct <= 0.55) return 0.55;
  if (requiredPct <= 0.72) return Math.round(requiredPct * 100) / 100;
  return 0.72; // cap — leads above this are realistically wholesaler-walks
}

function saleStr(saleIso) {
  if (!saleIso) return "Pre-foreclosure (no sale date)";
  const d = new Date(saleIso);
  const dts = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const pretty = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  if (dts < 0) return `Trustee sale: ${pretty} (passed)`;
  return `Trustee sale: ${pretty} (${dts} days from today)`;
}

// ─────────────────────────── per-page drawing ────────────────────────────

function drawSheet(doc, lead) {
  const { addr, owner, sale, arv, payoff } = lead;
  const wholesalePct = pickWholesalePct(arv, payoff);
  const wholesaleCash = arv * wholesalePct;
  const wholesaleNet = Math.max(0, wholesaleCash - payoff);

  const auctionWinLow = arv * 0.80;
  const auctionWinHigh = arv * 0.88;
  const auctionLow = Math.max(0, auctionWinLow - payoff - 5000);
  const auctionHigh = Math.max(0, auctionWinHigh - payoff - 5000);

  // HEADER
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a")
    .text(addr, 36, 36, { width: 720 });
  doc.font("Helvetica").fontSize(11).fillColor("#64748b")
    .text(saleStr(sale) + (owner ? "   ·   " + owner : ""), 36, 64, { width: 720 });
  doc.moveTo(36, 92).lineTo(756, 92).lineWidth(0.75).strokeColor("#cbd5e1").stroke();

  // BOXES — shrunk to 310 so method note + contact card both fit on
  // one landscape letter page (612pt tall, 36pt top/bottom margins).
  const boxTop = 108, boxHeight = 310, boxWidth = 229, gap = 16;
  drawBox(doc, 36, boxTop, boxWidth, boxHeight, "#fef2f2", "#dc2626",
    "Path 1 - Wholesale offer",
    [
      ["Cash offer to you", fmt(wholesaleCash)],
      ["(at " + Math.round(wholesalePct * 100) + "% of ARV)", ""],
      ["", ""],
      ["- Mortgage payoff (est.)", "- " + fmt(payoff)],
    ],
    {
      bigLabel: "Your take-home",
      bigValue: fmt(wholesaleNet),
      bigColor: wholesaleNet > 0 ? "#991b1b" : "#52525b",
      footer: wholesaleNet > 0
        ? ["Closes 14-21 days", "First cash offer accepted as-is"]
        : ["Wholesaler walks - payoff too high", "Auction is the only viable path"],
    });

  drawBox(doc, 36 + boxWidth + gap, boxTop, boxWidth, boxHeight, "#fafaf9", "#52525b",
    "Path 2 - Trustee sale runs",
    [
      ["Bank takes the house", ""],
      ["", ""],
      ["Recovers loan + costs", ""],
      ["", ""],
      ["Homeowner gets zero", ""],
    ],
    {
      bigLabel: "Your take-home",
      bigValue: "$0",
      bigColor: "#52525b",
      footer: ["Day of trustee sale", "Equity wiped at gavel"],
    });

  drawBox(doc, 36 + (boxWidth + gap) * 2, boxTop, boxWidth, boxHeight, "#f0fdf4", "#15803d",
    "Path 3 - Marketed sale",
    [
      ["Winning bid", fmtCompact(auctionWinLow) + "-" + fmtCompact(auctionWinHigh)],
      ["(80-88% of ARV)", ""],
      ["- Mortgage payoff", "- " + fmtCompact(payoff)],
      ["- Closing costs", "- " + fmtCompact(5000)],
    ],
    {
      bigLabel: "Your take-home",
      bigValue: fmtCompact(auctionLow) + "-" + fmtCompact(auctionHigh),
      bigColor: "#15803d",
      footer: ["Closes 30-45 days", "Buyer pays auction premium, not you"],
    });

  // METHOD NOTE - tight one-liner so it doesn't wrap.
  doc.font("Helvetica-Oblique").fontSize(8.5).fillColor("#64748b")
    .text(
      "Numbers are public-record estimates. Actual payoff sharpens with your servicer statement. Wholesale modeled at 45-72% of market (real TN cash-offer range). Auction via state-licensed TN firm.",
      36, boxTop + boxHeight + 10,
      { width: 720, align: "left", lineGap: 1 },
    );

  // CONTACT CARD - centered well above page bottom (612pt page; margin 36pt).
  const cardTop = boxTop + boxHeight + 44;
  doc.save();
  doc.roundedRect(36, cardTop, 720, 52, 6).fillColor("#ecfdf5").fill();
  doc.roundedRect(36, cardTop, 720, 52, 6).lineWidth(1.2).strokeColor("#34d399").stroke();
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#047857")
    .text("HOW TO REACH ME", 50, cardTop + 7, { width: 692, characterSpacing: 0.7 });
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a")
    .text("Patrick Yuri Armour", 50, cardTop + 17, { width: 692 });
  doc.font("Helvetica").fontSize(10).fillColor("#1e293b")
    .text("601-213-8868   |   falco@falco.llc   |   yuriarmour@gmail.com   |   falco.llc   |   Nashville, TN",
      50, cardTop + 34, { width: 692 });
}

function drawBox(doc, x, y, w, h, bg, border, title, rows, big) {
  doc.save();
  doc.roundedRect(x, y, w, h, 6).fillColor(bg).fill();
  doc.roundedRect(x, y, w, h, 6).lineWidth(1).strokeColor(border).stroke();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(10).fillColor(border)
    .text(title.toUpperCase(), x + 14, y + 14, { width: w - 28, characterSpacing: 0.6 });

  let cursor = y + 44;
  // Column split for two-column rows: label gets the left ~58%, value
  // gets the right ~38% with a small gap between. Prevents the long-
  // text overlap bug where label + right-aligned value would otherwise
  // write to the same x range at the same y.
  const innerW = w - 28;
  const labelColW = Math.floor(innerW * 0.58);
  const valueColW = Math.floor(innerW * 0.38);
  const valueColX = x + 14 + innerW - valueColW;
  for (const [label, value] of rows) {
    if (!label && !value) { cursor += 8; continue; }
    if (label && !value) {
      // Single-text row: full inner width
      doc.font("Helvetica").fontSize(10.5).fillColor("#475569")
        .text(label, x + 14, cursor, { width: innerW });
    } else {
      // Two-column row
      doc.font("Helvetica").fontSize(10.5).fillColor("#475569")
        .text(label || "", x + 14, cursor, { width: labelColW });
      doc.font("Helvetica").fontSize(10.5).fillColor("#1e293b")
        .text(value, valueColX, cursor, { width: valueColW, align: "right" });
    }
    cursor += 18;
  }

  const bigY = y + h - 130;
  doc.moveTo(x + 14, bigY - 6).lineTo(x + w - 14, bigY - 6)
    .lineWidth(0.5).strokeColor("#cbd5e1").stroke();
  doc.font("Helvetica").fontSize(10).fillColor("#64748b")
    .text(big.bigLabel.toUpperCase(), x + 14, bigY + 4, { width: w - 28, characterSpacing: 0.6 });
  doc.font("Helvetica-Bold").fontSize(20).fillColor(big.bigColor)
    .text(big.bigValue, x + 14, bigY + 22, { width: w - 28, align: "left" });

  let fy = y + h - 56;
  for (const note of big.footer) {
    doc.font("Helvetica").fontSize(9).fillColor("#64748b")
      .text(note, x + 14, fy, { width: w - 28 });
    fy += 13;
  }
}

// ─────────────────────────── main ────────────────────────────────────────

const outDir = path.join(process.env.USERPROFILE || process.env.HOME, "Downloads");
fs.mkdirSync(outDir, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const outPath = path.join(outDir, `falco-doorknock-math-${today}.pdf`);

const doc = new PDFDocument({
  size: "LETTER",
  layout: "landscape",
  margins: { top: 36, right: 36, bottom: 36, left: 36 },
  info: { Title: `FALCO door-knock math sheets — ${LEADS.length} leads`, Author: "FALCO · Patrick Yuri Armour" },
  autoFirstPage: false,
});

const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

for (const lead of LEADS) {
  doc.addPage();
  drawSheet(doc, lead);
}

doc.end();

stream.on("finish", () => {
  const stat = fs.statSync(outPath);
  console.log(`OK ${outPath}`);
  console.log(`   pages=${LEADS.length} size=${Math.round(stat.size / 1024)}KB`);
});
stream.on("error", (e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
