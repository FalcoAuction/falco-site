// One-page landscape PDF math sheet. The brutally simple version Patrick
// attaches to the brute-honest opener text. No logo, no marketing fluff,
// no explanatory paragraphs — three boxes, three numbers, three
// timelines. Looks like an accountant scribbled it on a napkin, which is
// exactly why distressed homeowners read it.

import PDFDocument from "pdfkit"
import { defaultInputsFor, computeMath, fmt } from "@/lib/math-sheet"

export type MathPdfInput = {
  address: string
  saleDate: string | null   // ISO date, or null for pre-foreclosure
  arv: number
  payoff: number             // estimated mortgage payoff
}

export async function buildMathPdf(input: MathPdfInput): Promise<Buffer> {
  // Letter landscape; margins kept narrow for usable area.
  const doc = new PDFDocument({
    size: "LETTER",
    layout: "landscape",
    margins: { top: 36, right: 36, bottom: 36, left: 36 },
    info: {
      Title: `FALCO math sheet — ${input.address}`,
      Author: "FALCO",
    },
  })

  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  })

  const m = computeMath(defaultInputsFor(input.arv, input.payoff))

  // ─────────────────────────────── HEADER ───────────────────────────────
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#0f172a")
    .text(input.address, 36, 36, { width: 720 })

  const saleStr = (() => {
    if (!input.saleDate) return "Pre-foreclosure (no sale date)"
    const d = new Date(input.saleDate)
    if (Number.isNaN(d.getTime())) return input.saleDate
    const dts = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    const pretty = d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    if (dts < 0) return `Trustee sale: ${pretty} (passed)`
    return `Trustee sale: ${pretty} (${dts} days from today)`
  })()

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#64748b")
    .text(saleStr, 36, 64, { width: 720 })

  // Horizontal rule under header
  doc
    .moveTo(36, 92)
    .lineTo(756, 92)
    .lineWidth(0.75)
    .strokeColor("#cbd5e1")
    .stroke()

  // ─────────────────────────────── BOXES ────────────────────────────────
  // Three side-by-side. Box layout: x0=36, total width 720, gap 16 → each box 229 wide.
  const boxTop = 110
  const boxHeight = 380
  const boxWidth = 229
  const gap = 16

  // Wholesale numbers (real-world calibrated to 55% of ARV)
  const wholesaleCash = Math.max(0, m.wholesaler.cashOfferStandard)
  const wholesaleNet = Math.max(0, m.wholesaler.realisticNet)
  const auctionLow = Math.max(0, m.auction.low.netToHomeowner)
  const auctionHigh = Math.max(0, m.auction.high.netToHomeowner)
  const auctionWinLow = input.arv * 0.80
  const auctionWinHigh = input.arv * 0.88

  drawBox(
    doc,
    36,
    boxTop,
    boxWidth,
    boxHeight,
    "#fef2f2",
    "#dc2626",
    "Path 1 · Wholesale offer",
    [
      ["Cash offer to you", fmt(wholesaleCash)],
      ["", ""],
      ["− Mortgage payoff (est.)", `− ${fmt(input.payoff)}`],
      ["", ""],
    ],
    {
      bigLabel: "Your take-home",
      bigValue: fmt(wholesaleNet),
      bigColor: "#991b1b",
      footer: ["Closes 14-21 days", "Requires accepting first cash offer"],
    }
  )

  drawBox(
    doc,
    36 + boxWidth + gap,
    boxTop,
    boxWidth,
    boxHeight,
    "#fafaf9",
    "#52525b",
    "Path 2 · Trustee sale runs",
    [
      ["What it is", "Bank takes back the house at courthouse"],
      ["", ""],
      ["Bank recovers", "Whatever it needs"],
      ["", ""],
    ],
    {
      bigLabel: "Your take-home",
      bigValue: "$0",
      bigColor: "#52525b",
      footer: ["Day of sale", "Equity wiped — almost always $0 in distress"],
    }
  )

  drawBox(
    doc,
    36 + (boxWidth + gap) * 2,
    boxTop,
    boxWidth,
    boxHeight,
    "#f0fdf4",
    "#15803d",
    "Path 3 · Marketed sale",
    [
      ["Winning bid range", `${fmt(auctionWinLow)} – ${fmt(auctionWinHigh)}`],
      ["", ""],
      ["− Mortgage payoff (est.)", `− ${fmt(input.payoff)}`],
      ["− Closing costs", `− ${fmt(5000)}`],
    ],
    {
      bigLabel: "Your take-home",
      bigValue: `${fmt(auctionLow)} – ${fmt(auctionHigh)}`,
      bigColor: "#15803d",
      footer: ["Closes 30-45 days", "Buyer pays the auction premium, not you"],
    }
  )

  // ─────────────────────────────── FOOTER ───────────────────────────────
  doc
    .font("Helvetica-Oblique")
    .fontSize(9)
    .fillColor("#64748b")
    .text(
      `Numbers from public AVM data + FALCO model. They sharpen once we pull the actual mortgage payoff letter from your servicer. The wholesale figure reflects what TN cash buyers actually offer on distressed properties (45-55% of market value), not the textbook formula. Marketed sale routed through Parks Auction & Realty (state-licensed).`,
      36,
      boxTop + boxHeight + 18,
      { width: 720, align: "left" }
    )

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#94a3b8")
    .text("FALCO · falco.llc · falco@falco.llc", 36, boxTop + boxHeight + 70, {
      width: 720,
      align: "center",
    })

  doc.end()
  return done
}

// ─────────────────────────────── helpers ────────────────────────────────

function drawBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  bg: string,
  border: string,
  title: string,
  rows: Array<[string, string]>,
  big: { bigLabel: string; bigValue: string; bigColor: string; footer: string[] }
) {
  // Filled background + border
  doc.save()
  doc
    .roundedRect(x, y, w, h, 6)
    .fillColor(bg)
    .fill()
  doc
    .roundedRect(x, y, w, h, 6)
    .lineWidth(1)
    .strokeColor(border)
    .stroke()
  doc.restore()

  // Title bar
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(border)
    .text(title.toUpperCase(), x + 14, y + 14, {
      width: w - 28,
      characterSpacing: 0.6,
    })

  // Rows
  let cursor = y + 44
  for (const [label, value] of rows) {
    if (label === "" && value === "") {
      cursor += 8
      continue
    }
    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor("#475569")
      .text(label, x + 14, cursor, { width: w - 28 })
    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor("#1e293b")
      .text(value, x + 14, cursor, { width: w - 28, align: "right" })
    cursor += 18
  }

  // Big take-home number
  const bigY = y + h - 130
  doc
    .moveTo(x + 14, bigY - 6)
    .lineTo(x + w - 14, bigY - 6)
    .lineWidth(0.5)
    .strokeColor("#cbd5e1")
    .stroke()
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#64748b")
    .text(big.bigLabel.toUpperCase(), x + 14, bigY + 4, {
      width: w - 28,
      characterSpacing: 0.6,
    })
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(big.bigColor)
    .text(big.bigValue, x + 14, bigY + 22, {
      width: w - 28,
      align: "left",
    })

  // Footer notes
  let fy = y + h - 56
  for (const note of big.footer) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64748b")
      .text(note, x + 14, fy, { width: w - 28 })
    fy += 13
  }
}
