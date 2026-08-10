package com.kontora.exportworker.controller;

import com.kontora.exportworker.dto.ParsedInvoiceDto;
import com.kontora.exportworker.dto.XmlInvoiceImportResult;
import com.kontora.exportworker.service.XmlInvoiceImportService;
import java.io.InputStream;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

// Chapter 18 — XXE lab (INTENTIONAL, training only). Deliberately a separate
// controller/endpoint from ImportController (the hardened client importer)
// so that chapter's XXE-safe parser is never touched by this one.
@RestController
public class InvoiceImportController {

    private final XmlInvoiceImportService xmlInvoiceImportService;

    public InvoiceImportController(XmlInvoiceImportService xmlInvoiceImportService) {
        this.xmlInvoiceImportService = xmlInvoiceImportService;
    }

    // Always responds 200 with a structured result — including on a parse
    // failure, whose exception message is returned verbatim as `parseError`
    // instead of a generic message (see XmlInvoiceImportService for why:
    // error-based XXE exfil depends on that message reaching the caller).
    @PostMapping(value = "/import/invoice-xml", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<XmlInvoiceImportResult> importInvoiceXml(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.ok(new XmlInvoiceImportResult(null, "An XML file is required."));
        }
        try (InputStream in = file.getInputStream()) {
            ParsedInvoiceDto invoice = xmlInvoiceImportService.parseInvoice(in);
            return ResponseEntity.ok(new XmlInvoiceImportResult(invoice, null));
        } catch (Exception e) {
            String message = e.getMessage() != null ? e.getMessage() : e.toString();
            return ResponseEntity.ok(new XmlInvoiceImportResult(null, message));
        }
    }
}
