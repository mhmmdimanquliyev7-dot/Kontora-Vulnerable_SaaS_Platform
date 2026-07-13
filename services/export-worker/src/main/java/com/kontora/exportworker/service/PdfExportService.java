package com.kontora.exportworker.service;

import com.kontora.exportworker.dto.InvoiceDto;
import com.kontora.exportworker.dto.InvoiceExportRequest;
import com.kontora.exportworker.dto.LineItemDto;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

/**
 * A deliberately simple, low-memory renderer: one page per invoice, plain
 * text positioning, no image/font embedding beyond the built-in Standard14
 * fonts (so nothing extra is loaded into the JVM heap per request). This is
 * a bulk/batch companion to the main API's own single-invoice PDF (pdfkit,
 * Node side) — not a replacement for it.
 */
@Service
public class PdfExportService {

    private static final PDFont FONT = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDFont FONT_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private static final float MARGIN = 50f;

    public byte[] toPdf(InvoiceExportRequest request) throws IOException {
        try (PDDocument document = new PDDocument()) {
            for (InvoiceDto invoice : request.invoices()) {
                renderInvoicePage(document, request, invoice);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        }
    }

    private void renderInvoicePage(PDDocument document, InvoiceExportRequest request, InvoiceDto invoice)
            throws IOException {
        PDPage page = new PDPage(PDRectangle.LETTER);
        document.addPage(page);
        float y = page.getMediaBox().getHeight() - MARGIN;
        float left = MARGIN;

        try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
            y = writeLine(cs, left, y, FONT_BOLD, 16, request.company().name());
            if (request.company().address() != null) {
                y = writeLine(cs, left, y, FONT, 9, request.company().address());
            }
            y -= 15;

            y = writeLine(cs, left, y, FONT_BOLD, 13, "Invoice " + invoice.number());
            y = writeLine(cs, left, y, FONT, 10, "Status: " + invoice.status());
            y = writeLine(cs, left, y, FONT, 10, "Issue date: " + invoice.issueDate());
            y = writeLine(cs, left, y, FONT, 10, "Due date: " + invoice.dueDate());
            y -= 10;

            y = writeLine(cs, left, y, FONT_BOLD, 11, "Bill to:");
            y = writeLine(cs, left, y, FONT, 10, invoice.client().name());
            if (invoice.client().email() != null) {
                y = writeLine(cs, left, y, FONT, 10, invoice.client().email());
            }
            y -= 15;

            y = writeLine(cs, left, y, FONT_BOLD, 10, String.format(
                    "%-40s %8s %12s %12s", "Description", "Qty", "Unit price", "Amount"));
            y -= 4;
            for (LineItemDto item : invoice.items()) {
                String desc = item.description().length() > 38
                        ? item.description().substring(0, 35) + "..."
                        : item.description();
                y = writeLine(cs, left, y, FONT, 10, String.format(
                        "%-40s %8s %12s %12s",
                        desc,
                        item.quantity().toPlainString(),
                        money(item.unitPrice(), invoice.currency()),
                        money(item.amount(), invoice.currency())));
            }
            y -= 10;

            y = writeLine(cs, left, y, FONT, 10, "Subtotal: " + money(invoice.subtotal(), invoice.currency()));
            y = writeLine(cs, left, y, FONT, 10, "Tax: " + money(invoice.tax(), invoice.currency()));
            y = writeLine(cs, left, y, FONT_BOLD, 11, "Total: " + money(invoice.total(), invoice.currency()));

            if (invoice.notes() != null && !invoice.notes().isBlank()) {
                y -= 15;
                writeLine(cs, left, y, FONT, 9, "Notes: " + invoice.notes());
            }
        }
    }

    private static String money(java.math.BigDecimal amount, String currency) {
        return currency + " " + amount.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }

    private static float writeLine(PDPageContentStream cs, float x, float y, PDFont font, float size, String text)
            throws IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(sanitize(text));
        cs.endText();
        return y - (size + 6);
    }

    // Standard14 fonts only support WinAnsiEncoding — strip anything outside
    // it rather than let PDFBox throw mid-render on an unexpected character.
    private static String sanitize(String text) {
        StringBuilder sb = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            sb.append(c < 32 || c > 255 ? '?' : c);
        }
        return sb.toString();
    }
}
