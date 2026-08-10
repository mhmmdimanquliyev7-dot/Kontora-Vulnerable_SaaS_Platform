package com.kontora.exportworker.dto;

// Chapter 18 — XXE lab (INTENTIONAL, training only). Preview-only result:
// either `invoice` is populated (parse succeeded) or `parseError` is (parse
// failed) — never both. The exception message is returned verbatim rather
// than a generic message, so error-based exfiltration techniques that leak
// data through a parser exception are visible to the caller.
public record XmlInvoiceImportResult(ParsedInvoiceDto invoice, String parseError) {
}
