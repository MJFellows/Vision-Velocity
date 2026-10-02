/**
 * Minimal PDF layout helper on top of pdf-lib (standard Helvetica fonts, A4).
 * Handles headings, label/value rows, wrapped paragraphs, simple tables and
 * page breaks, with a footer on every page.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const NAVY = rgb(0.118, 0.227, 0.373);
const GREY = rgb(0.42, 0.45, 0.5);
const BLACK = rgb(0.12, 0.16, 0.22);

/** Standard PDF fonts only cover Latin-1 plus a few symbols; replace anything else. */
export function pdfSafe(text: string | number | null | undefined): string {
  const s = text === null || text === undefined ? '' : String(text);
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/×/g, 'x')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}

export class PdfWriter {
  private constructor(
    private doc: PDFDocument,
    private regular: PDFFont,
    private bold: PDFFont,
    private footerText: string
  ) {}

  private page!: PDFPage;
  private y = 0;

  static async create(footerText: string): Promise<PdfWriter> {
    const doc = await PDFDocument.create();
    const w = new PdfWriter(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold), footerText);
    w.newPage();
    return w;
  }

  private get width() {
    return A4[0] - MARGIN * 2;
  }

  private newPage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - MARGIN;
  }

  private ensure(space: number) {
    if (this.y - space < MARGIN + 24) this.newPage();
  }

  private wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const lines: string[] = [];
    for (const para of pdfSafe(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/)) {
        const attempt = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(attempt, size) <= width) line = attempt;
        else {
          if (line) lines.push(line);
          line = word;
          while (font.widthOfTextAtSize(line, size) > width && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
            lines.push(line.slice(0, cut));
            line = line.slice(cut);
          }
        }
      }
      lines.push(line);
    }
    return lines;
  }

  /** Big title with the brand name above it. */
  title(text: string, subtitle?: string) {
    this.page.drawText('VISION VELOCITY', { x: MARGIN, y: this.y, size: 10, font: this.bold, color: NAVY });
    this.y -= 26;
    for (const line of this.wrap(text, this.bold, 20, this.width)) {
      this.page.drawText(line, { x: MARGIN, y: this.y, size: 20, font: this.bold, color: BLACK });
      this.y -= 24;
    }
    if (subtitle) {
      for (const line of this.wrap(subtitle, this.regular, 11, this.width)) {
        this.page.drawText(line, { x: MARGIN, y: this.y, size: 11, font: this.regular, color: GREY });
        this.y -= 15;
      }
    }
    this.y -= 6;
  }

  /** Highlighted notice box, e.g. "Order summary - not a tax invoice". */
  notice(text: string) {
    const lines = this.wrap(text, this.bold, 10, this.width - 16);
    const h = lines.length * 13 + 10;
    this.ensure(h + 8);
    this.page.drawRectangle({ x: MARGIN, y: this.y - h + 10, width: this.width, height: h, color: rgb(0.96, 0.96, 0.97), borderColor: rgb(0.85, 0.86, 0.88), borderWidth: 0.75 });
    let yy = this.y - 2;
    for (const line of lines) {
      this.page.drawText(line, { x: MARGIN + 8, y: yy, size: 10, font: this.bold, color: BLACK });
      yy -= 13;
    }
    this.y -= h + 10;
  }

  heading(text: string) {
    this.ensure(40);
    this.y -= 8;
    this.page.drawText(pdfSafe(text), { x: MARGIN, y: this.y, size: 13, font: this.bold, color: NAVY });
    this.y -= 6;
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: MARGIN + this.width, y: this.y }, thickness: 0.75, color: rgb(0.85, 0.86, 0.88) });
    this.y -= 14;
  }

  /** Label on the left, value (wrapped) on the right. Skipped when value is empty unless `always`. */
  row(label: string, value: string | number | null | undefined, always = false) {
    const v = value === null || value === undefined || value === '' ? (always ? '-' : null) : String(value);
    if (v === null) return;
    const labelW = 140;
    const lines = this.wrap(v, this.regular, 10.5, this.width - labelW);
    this.ensure(lines.length * 14 + 4);
    this.page.drawText(pdfSafe(label), { x: MARGIN, y: this.y, size: 10.5, font: this.bold, color: GREY });
    for (const line of lines) {
      this.page.drawText(line, { x: MARGIN + labelW, y: this.y, size: 10.5, font: this.regular, color: BLACK });
      this.y -= 14;
    }
    this.y -= 2;
  }

  paragraph(text: string, size = 10.5, color = BLACK) {
    for (const line of this.wrap(text, this.regular, size, this.width)) {
      this.ensure(size + 4);
      this.page.drawText(line, { x: MARGIN, y: this.y, size, font: this.regular, color });
      this.y -= size + 3.5;
    }
    this.y -= 4;
  }

  /** Simple table; widths are fractions of the page width. */
  table(headers: string[], rows: (string | number | null | undefined)[][], widths: number[]) {
    const cols = widths.map((w) => w * this.width);
    const drawRow = (cells: (string | number | null | undefined)[], font: PDFFont, shade: boolean) => {
      const wrapped = cells.map((c, i) => this.wrap(c === null || c === undefined ? '' : String(c), font, 9.5, cols[i] - 6));
      const h = Math.max(...wrapped.map((l) => l.length)) * 12 + 6;
      this.ensure(h + 2);
      if (shade) this.page.drawRectangle({ x: MARGIN, y: this.y - h + 9, width: this.width, height: h, color: rgb(0.95, 0.96, 0.97) });
      let x = MARGIN;
      wrapped.forEach((lines, i) => {
        let yy = this.y;
        for (const line of lines) {
          this.page.drawText(line, { x: x + 3, y: yy, size: 9.5, font, color: BLACK });
          yy -= 12;
        }
        x += cols[i];
      });
      this.y -= h;
    };
    drawRow(headers, this.bold, true);
    if (rows.length === 0) {
      this.paragraph('None recorded.', 9.5, GREY);
      return;
    }
    for (const r of rows) drawRow(r, this.regular, false);
    this.y -= 6;
  }

  /** Empty boxes for writing in on the day (e.g. results). */
  writeInLines(labels: string[]) {
    for (const label of labels) {
      this.ensure(24);
      this.page.drawText(pdfSafe(label), { x: MARGIN, y: this.y, size: 10.5, font: this.bold, color: GREY });
      this.page.drawLine({ start: { x: MARGIN + 160, y: this.y - 2 }, end: { x: MARGIN + this.width, y: this.y - 2 }, thickness: 0.5, color: GREY });
      this.y -= 24;
    }
  }

  async finish(): Promise<Uint8Array> {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => {
      const text = pdfSafe(`${this.footerText}    Page ${i + 1} of ${pages.length}`);
      p.drawText(text, { x: MARGIN, y: 28, size: 8.5, font: this.regular, color: GREY });
    });
    this.doc.setTitle(this.footerText);
    this.doc.setProducer('Vision Velocity');
    return this.doc.save();
  }
}
