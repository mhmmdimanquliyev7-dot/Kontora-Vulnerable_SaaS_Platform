package com.kontora.exportworker.controller;

import com.kontora.exportworker.dto.InvoiceExportRequest;
import com.kontora.exportworker.service.PdfExportService;
import com.kontora.exportworker.service.XmlExportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ExportController {

    private final XmlExportService xmlExportService;
    private final PdfExportService pdfExportService;

    public ExportController(XmlExportService xmlExportService, PdfExportService pdfExportService) {
        this.xmlExportService = xmlExportService;
        this.pdfExportService = pdfExportService;
    }

    @PostMapping(value = "/export/xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<byte[]> exportXml(@Valid @RequestBody InvoiceExportRequest request) throws Exception {
        byte[] xml = xmlExportService.toXml(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"invoices.xml\"")
                .contentType(MediaType.APPLICATION_XML)
                .body(xml);
    }

    @PostMapping(value = "/export/pdf", produces = "application/pdf")
    public ResponseEntity<byte[]> exportPdf(@Valid @RequestBody InvoiceExportRequest request) throws Exception {
        byte[] pdf = pdfExportService.toPdf(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"invoices.pdf\"")
                .contentType(MediaType.valueOf("application/pdf"))
                .body(pdf);
    }
}
