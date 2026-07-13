import PDFDocument from "pdfkit";
import type { Response } from "express";

import type { Client, Company, Invoice, InvoiceItem } from "@kontora/db";

export interface InvoicePdfData {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client;
  company: Company;
}

function money(amount: unknown, currency: string): string {
  return `${currency} ${Number(amount).toFixed(2)}`;
}

// Deliberately basic — "stub" in the literal sense: real content, no
// letterhead styling, logo, or multi-page pagination. A later chapter can
// replace the layout without touching anything that calls this function.
export function streamInvoicePdf(res: Response, data: InvoicePdfData): void {
  const { invoice, items, client, company } = data;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${invoice.number}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text(company.name, { continued: false });
  doc
    .fontSize(10)
    .fillColor("#555")
    .text(company.address ?? "");
  doc.moveDown(1.5);

  doc.fillColor("#000").fontSize(16).text(`Invoice ${invoice.number}`);
  doc.fontSize(10).fillColor("#555");
  doc.text(`Status: ${invoice.status}`);
  doc.text(`Issue date: ${invoice.issueDate.toISOString().slice(0, 10)}`);
  doc.text(`Due date: ${invoice.dueDate.toISOString().slice(0, 10)}`);
  doc.moveDown();

  doc.fillColor("#000").fontSize(12).text("Bill to:");
  doc.fontSize(10).fillColor("#555").text(client.name);
  if (client.email) doc.text(client.email);
  if (client.billingAddress) doc.text(client.billingAddress);
  doc.moveDown(1.5);

  doc.fillColor("#000").fontSize(10);
  const tableTop = doc.y;
  doc.text("Description", 50, tableTop, { width: 260 });
  doc.text("Qty", 320, tableTop, { width: 60, align: "right" });
  doc.text("Unit price", 380, tableTop, { width: 80, align: "right" });
  doc.text("Amount", 460, tableTop, { width: 80, align: "right" });
  doc
    .moveTo(50, tableTop + 15)
    .lineTo(540, tableTop + 15)
    .stroke();

  let y = tableTop + 22;
  for (const item of items) {
    doc.text(item.description, 50, y, { width: 260 });
    doc.text(String(item.quantity), 320, y, { width: 60, align: "right" });
    doc.text(money(item.unitPrice, invoice.currency), 380, y, { width: 80, align: "right" });
    doc.text(money(item.amount, invoice.currency), 460, y, { width: 80, align: "right" });
    y += 20;
  }

  doc
    .moveTo(50, y + 5)
    .lineTo(540, y + 5)
    .stroke();
  y += 15;
  doc.text("Subtotal", 380, y, { width: 80, align: "right" });
  doc.text(money(invoice.subtotal, invoice.currency), 460, y, { width: 80, align: "right" });
  y += 18;
  doc.text("Tax", 380, y, { width: 80, align: "right" });
  doc.text(money(invoice.tax, invoice.currency), 460, y, { width: 80, align: "right" });
  y += 18;
  doc.font("Helvetica-Bold");
  doc.text("Total", 380, y, { width: 80, align: "right" });
  doc.text(money(invoice.total, invoice.currency), 460, y, { width: 80, align: "right" });
  doc.font("Helvetica");

  if (invoice.notes) {
    doc.moveDown(3);
    doc.fontSize(10).fillColor("#555").text(invoice.notes);
  }

  doc.end();
}
