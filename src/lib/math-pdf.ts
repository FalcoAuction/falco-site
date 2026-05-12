// One-page landscape PDF math sheet. The brutally simple version Patrick
// attaches to the brute-honest opener text. No logo, no marketing fluff,
// no explanatory paragraphs — three boxes, three numbers, three
// timelines. Looks like an accountant scribbled it on a napkin, which is
// exactly why distressed homeowners read it.
//
// Multi-page version (buildMultiMathPdf) concatenates many sheets into
// one PDF for bulk-print door-knock days.

import PDFDocument from "pdfkit"
import { defaultInputsFor, computeMath, fmt } from "@/lib/math-sheet"

export type MathPdfInput = {
  address: string
  saleDate: string | null   // ISO date, or null for pre-foreclosure
  arv: number
  payoff: number             // estimated mortgage payoff
  /** Owner first/last for header. Optional — falls back to property only. */
  ownerName?: string | null
}

export async function buildMathPdf(input: MathPdfInput): Promise<Buffer> {
  const doc = newMathDoc(input.address)
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  })
  drawMathSheetPage(doc, input)
  doc.end()
  return done
}

/**
 * Concatenate many math sheets into one multi-page PDF.
 * Each input gets its own landscape letter page. Used by the bulk-
 * download endpoint so Patrick can print all his door-knock leads
 * in one job.
 */
export async function buildMultiMathPdf(inputs: MathPdfInput[]): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "LETTER",
    layout: "landscape",
    margins: { top: 36, right: 36, bottom: 36, left: 36 },
    info: {
      Title: `FALCO math sheets — ${inputs.length} properties`,
      Author: "FALCO · Patrick Yuri Armour",
    },
    autoFirstPage: false,
  })
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  })
  for (const input of inputs) {
    doc.addPage()
    drawMathSheetPage(doc, input)
  }
  doc.end()
  return done
}

// ─────────────────────────────── internals ────────────────────────────────

function newMathDoc(title: string): PDFKit.PDFDocument {
  return new PDFDocument({
    size: "LETTER",
    layout: "landscape",
    margins: { top: 36, right: 36, bottom: 36, left: 36 },
    info: {
      Title: `FALCO math sheet — ${title}`,
      Author: "FALCO · Patrick Yuri Armour",
    },
  })
}

function drawMathSheetPage(doc: PDFKit.PDFDocument, input: MathPdfInput): void {
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

  const ownerSuffix = input.ownerName ? `   ·   ${input.ownerName}` : ""

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#64748b")
    .text(saleStr + ownerSuffix, 36, 64, { width: 720 })

  doc
    .moveTo(36, 92)
    .lineTo(756, 92)
    .lineWidth(0.75)
    .strokeColor("#cbd5e1")
    .stroke()

  // ─────────────────────────────── BOXES ────────────────────────────────
  const boxTop = 110
  const boxHeight = 360 // a bit shorter to make room for contact block below footer
  const boxWidth = 229
  const gap = 16

  const wholesaleCash = Math.max(0, m.wholesaler.cashOfferStandard)
  const wholesaleNet = Math.max(0, m.wholesaler.realisticNet)
  const auctionLow = Math.max(0, m.auction.low.netToHomeowner)
  const auctionHigh = Math.max(0, m.auction.high.netToHomeowner)
  const auctionWinLow = input.arv * 0.80
  const auctionWinHigh = input.arv * 0.88

  drawBox(
    doc,
    36, boxTop, boxWidth, boxHeight,
    "#fef2f2", "#dc2626",
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
    },
  )

  drawBox(
    doc,
    36 + boxWidth + gap, boxTop, boxWidth, boxHeight,
    "#fafaf9", "#52525b",
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
    },
  )

  drawBox(
    doc,
    36 + (boxWidth + gap) * 2, boxTop, boxWidth, boxHeight,
    "#f0fdf4", "#15803d",
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
    },
  )

  // ─────────────────────────── METHOD NOTE ───────────────────────────────
  doc
    .font("Helvetica-Oblique")
    .fontSize(9)
    .fillColor("#64748b")
    .text(
      `Numbers from public AVM data + FALCO model. They sharpen once we pull the actual mortgage payoff letter from your servicer. The wholesale figure reflects what TN cash buyers actually offer on distressed properties (45-55% of market value), not the textbook formula. Marketed sale routed through a state-licensed TN auction firm.`,
      36, boxTop + boxHeight + 12,
      { width: 720, align: "left" },
    )

  // ─────────────────────────── CONTACT BLOCK ─────────────────────────────
  // Emerald-bordered card with full callback info so the homeowner
  // doesn't need a business card. Lands at the bottom of every page.
  const cardTop = boxTop + boxHeight + 60
  const cardLeft = 36
  const cardWidth = 720
  const cardHeight = 56
  doc.save()
  doc
    .roundedRect(cardLeft, cardTop, cardWidth, cardHeight, 6)
    .fillColor("#ecfdf5")
    .fill()
  doc
    .roundedRect(cardLeft, cardTop, cardWidth, cardHeight, 6)
    .lineWidth(1.2)
    .strokeColor("#34d399")
    .stroke()
  doc.restore()

  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#047857")
    .text("HOW TO REACH ME", cardLeft + 14, cardTop + 8, {
      width: cardWidth - 28,
      characterSpacing: 0.7,
    })
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#0f172a")
    .text("Patrick Yuri Armour", cardLeft + 14, cardTop + 20, {
      width: cardWidth - 28,
    })
  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor("#1e293b")
    .text("601-213-8868   ·   falco@falco.llc   ·   yuriarmour@gmail.com   ·   falco.llc   ·   Nashville, TN",
      cardLeft + 14, cardTop + 38,
      { width: cardWidth - 28 },
    )
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
  big: { bigLabel: string; bigValue: string; bigColor: string; footer: string[] },
) {
  doc.save()
  doc.roundedRect(x, y, w, h, 6).fillColor(bg).fill()
  doc.roundedRect(x, y, w, h, 6).lineWidth(1).strokeColor(border).stroke()
  doc.restore()

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(border)
    .text(title.toUpperCase(), x + 14, y + 14, {
      width: w - 28,
      characterSpacing: 0.6,
    })

  let cursor = y + 44
  for (const [label, value] of rows) {
    if (label === "" && value === "") {
      cursor += 8
      continue
    }
    doc.font("Helvetica").fontSize(10.5).fillColor("#475569")
      .text(label, x + 14, cursor, { width: w - 28 })
    doc.font("Helvetica").fontSize(10.5).fillColor("#1e293b")
      .text(value, x + 14, cursor, { width: w - 28, align: "right" })
    cursor += 18
  }

  const bigY = y + h - 130
  doc.moveTo(x + 14, bigY - 6).lineTo(x + w - 14, bigY - 6)
    .lineWidth(0.5).strokeColor("#cbd5e1").stroke()
  doc.font("Helvetica").fontSize(10).fillColor("#64748b")
    .text(big.bigLabel.toUpperCase(), x + 14, bigY + 4, {
      width: w - 28, characterSpacing: 0.6,
    })
  doc.font("Helvetica-Bold").fontSize(20).fillColor(big.bigColor)
    .text(big.bigValue, x + 14, bigY + 22, {
      width: w - 28, align: "left",
    })

  let fy = y + h - 56
  for (const note of big.footer) {
    doc.font("Helvetica").fontSize(9).fillColor("#64748b")
      .text(note, x + 14, fy, { width: w - 28 })
    fy += 13
  }
}
