import PDFDocument from "pdfkit";
import type { Response } from "express";

import type { Client, Company, Invoice } from "@kontora/db";

export type StatementTemplate = "standard" | "detailed";

export interface StatementData {
  company: Company;
  client: Client;
  from: Date;
  to: Date;
  template: StatementTemplate;
  introText?: string;
  invoices: Invoice[];
}

function money(amount: unknown, currency: string): string {
  return `${currency} ${Number(amount).toFixed(2)}`;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Renders a client statement PDF in-process with pdfkit. There is no shelling
// out and no string-templating engine: every user-influenced value (the
// client's name, invoice notes, the caller's introText) is passed to
// doc.text() as a data string. pdfkit draws it as literal text — it is never
// evaluated, so none of it can inject layout, commands, or markup. The
// `template` argument only toggles which server-defined sections render; it is
// an enum, never a path.
export function streamStatementPdf(res: Response, data: StatementData): void {
  const { company, client, from, to, template, introText, invoices } = data;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="statement-${fmtDate(from)}-${fmtDate(to)}.pdf"`,
  );

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  const currency = invoices[0]?.currency ?? "USD";

  doc.fontSize(20).fillColor("#000").text(company.name);
  if (company.address) doc.fontSize(10).fillColor("#555").text(company.address);
  doc.moveDown(1);

  doc.fillColor("#000").fontSize(16).text("Account statement");
  doc.fontSize(10).fillColor("#555");
  doc.text(`Period: ${fmtDate(from)} to ${fmtDate(to)}`);
  doc.moveDown(0.5);

  doc.fillColor("#000").fontSize(12).text("Statement for:");
  doc.fontSize(10).fillColor("#555").text(client.name);
  if (client.email) doc.text(client.email);
  if (client.billingAddress) doc.text(client.billingAddress);
  doc.moveDown(1);

  if (introText) {
    doc.fillColor("#333").fontSize(10).text(introText, { align: "left" });
    doc.moveDown(1);
  }

  // Table header
  doc.fillColor("#000").fontSize(10);
  const top = doc.y;
  doc.text("Invoice", 50, top, { width: 90 });
  doc.text("Issued", 140, top, { width: 80 });
  doc.text("Due", 220, top, { width: 80 });
  doc.text("Status", 300, top, { width: 70 });
  doc.text("Total", 400, top, { width: 140, align: "right" });
  doc
    .moveTo(50, top + 15)
    .lineTo(540, top + 15)
    .stroke();

  let y = top + 22;
  let total = 0;
  let outstanding = 0;

  for (const invoice of invoices) {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    doc.fillColor("#000").text(invoice.number, 50, y, { width: 90 });
    doc.text(fmtDate(invoice.issueDate), 140, y, { width: 80 });
    doc.text(fmtDate(invoice.dueDate), 220, y, { width: 80 });
    doc.text(invoice.status, 300, y, { width: 70 });
    doc.text(money(invoice.total, invoice.currency), 400, y, { width: 140, align: "right" });
    y += 18;

    const amount = Number(invoice.total);
    total += amount;
    if (invoice.status === "SENT" || invoice.status === "OVERDUE") {
      outstanding += amount;
    }

    // The "detailed" template adds each invoice's notes beneath its row; the
    // "standard" template omits them. Same data, different server-chosen
    // sections — this is all `template` controls.
    if (template === "detailed" && invoice.notes) {
      doc.fillColor("#777").fontSize(8).text(invoice.notes, 50, y, { width: 490 });
      doc.fontSize(10);
      y += 16;
    }
  }

  doc
    .moveTo(50, y + 4)
    .lineTo(540, y + 4)
    .stroke();
  y += 12;

  doc.fillColor("#000").fontSize(10);
  doc.text(`Invoices in period: ${invoices.length}`, 50, y);
  doc.text(`Total billed: ${money(total, currency)}`, 400, y, { width: 140, align: "right" });
  y += 16;
  doc.font("Helvetica-Bold");
  doc.text(`Outstanding: ${money(outstanding, currency)}`, 400, y, { width: 140, align: "right" });
  doc.font("Helvetica");

  doc.end();
}
