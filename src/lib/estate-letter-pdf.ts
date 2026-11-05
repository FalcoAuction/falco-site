// Renders executor letters and estate property reports (estate-letters.ts)
// into one print-ready PDF: for each estate, page 1 is the letter addressed
// for a #10 window envelope, page 2 the property report. Batch output so
// Patrick prints, folds and mails a whole run at once.

import PDFDocument from "pdfkit"
import {
  DISCLOSURE,
  FALCO_CONTACT,
  REPORT_NOTES,
  type EstateLetter,
  letterParagraphs,
  reportSections,
} from "@/lib/estate-letters"

const INK = "#111111"
const MUTED = "#555555"
const RULE = "#cccccc"
const LEFT = 72
const WIDTH = 468 // letter width 612 minus 1in margins

export async function buildEstateLettersPdf(estates: EstateLetter[], today = new Date()): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 54, right: 72, bottom: 54, left: 72 },
    info: { Title: `FALCO estate letters (${estates.length})`, Author: `${FALCO_CONTACT.company} · ${FALCO_CONTACT.name}` },
    autoFirstPage: false,
  })
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))))
  const dateLine = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  for (const e of estates) {
    doc.addPage()
    drawLetter(doc, e, dateLine)
    doc.addPage()
    drawReport(doc, e, dateLine)
  }
  doc.end()
  return done
}

function letterhead(doc: PDFKit.PDFDocument): void {
  doc.font("Helvetica-Bold").fontSize(14).fillColor(INK).text(FALCO_CONTACT.company, LEFT, 54)
  doc.font("Helvetica").fontSize(9).fillColor(MUTED)
    .text(`${FALCO_CONTACT.name}  ·  ${FALCO_CONTACT.phone}  ·  ${FALCO_CONTACT.email}  ·  ${FALCO_CONTACT.web}`, LEFT, 72)
  doc.moveTo(LEFT, 88).lineTo(LEFT + WIDTH, 88).lineWidth(0.5).strokeColor(RULE).stroke()
}

function footer(doc: PDFKit.PDFDocument): void {
  // Draw inside the bottom margin without triggering a page break.
  const bottom = doc.page.margins.bottom
  doc.page.margins.bottom = 0
  doc.font("Helvetica").fontSize(7).fillColor(MUTED).text(DISCLOSURE, LEFT, 712, { width: WIDTH, lineGap: 1 })
  doc.page.margins.bottom = bottom
}

function drawLetter(doc: PDFKit.PDFDocument, e: EstateLetter, dateLine: string): void {
  letterhead(doc)
  doc.font("Helvetica").fontSize(10.5).fillColor(INK).text(dateLine, LEFT, 108)
  // Recipient block sits where a #10 window envelope shows it (about 2in
  // from the top, 0.875in from the left once folded in thirds).
  // Up to seven lines at 10pt still fit the window.
  doc.font("Helvetica").fontSize(10).fillColor(INK)
    .text(e.recipient.lines.slice(0, 7).join("\n"), 63, 144, { width: 300, lineGap: 0.5 })
  doc.font("Helvetica").fontSize(9).fillColor(MUTED)
    .text(`Re: Estate of ${e.decedent}, ${e.county} County docket ${e.docket}`, LEFT, 236, { width: WIDTH })

  let y = 262
  const paragraphs = letterParagraphs(e)
  doc.font("Helvetica").fontSize(10.5).fillColor(INK)
  for (const p of paragraphs) {
    doc.text(p, LEFT, y, { width: WIDTH, lineGap: 2 })
    y = doc.y + 9
  }
  doc.text("Sincerely,", LEFT, y + 4)
  doc.font("Helvetica-Bold").text(FALCO_CONTACT.name, LEFT, y + 44)
  doc.font("Helvetica").fillColor(MUTED).fontSize(9.5).text(`${FALCO_CONTACT.company}  ·  ${FALCO_CONTACT.phone}`, LEFT, doc.y + 1)
  footer(doc)
}

function drawReport(doc: PDFKit.PDFDocument, e: EstateLetter, dateLine: string): void {
  letterhead(doc)
  doc.font("Helvetica-Bold").fontSize(15).fillColor(INK).text("Estate Property Report", LEFT, 104)
  doc.font("Helvetica").fontSize(9).fillColor(MUTED)
    .text(`Prepared ${dateLine} from public records. Free to the estate.`, LEFT, 124)

  let y = 148
  for (const section of reportSections(e)) {
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK).text(section.title.toUpperCase(), LEFT, y, { characterSpacing: 0.5 })
    y = doc.y + 4
    for (const [label, value] of section.rows) {
      doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(label, LEFT, y, { width: 130 })
      const labelBottom = doc.y
      doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(value, LEFT + 138, y, { width: WIDTH - 138 })
      y = Math.max(labelBottom, doc.y) + 5
    }
    y += 10
  }
  for (const note of REPORT_NOTES) {
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(note.title, LEFT, y, { width: WIDTH })
    doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(note.body, LEFT, doc.y + 2, { width: WIDTH, lineGap: 1 })
    y = doc.y + 10
  }
  footer(doc)
}
