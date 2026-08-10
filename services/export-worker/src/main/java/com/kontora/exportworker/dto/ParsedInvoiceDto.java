package com.kontora.exportworker.dto;

// Chapter 18 — XXE lab (INTENTIONAL, training only). One parsed invoice from
// an import XML document. Every field is the raw text content of its XML
// element, echoed back to the caller exactly as the parser resolved it —
// including whatever an expanded entity resolved to.
public record ParsedInvoiceDto(
        String number,
        String clientName,
        String issueDate,
        String dueDate,
        String currency,
        String total,
        String notes) {
}
