package com.kontora.exportworker.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

// Stateless by design: the main API (the sole owner of invoice data) sends
// everything needed for the export in the request body. export-worker holds
// no database credentials at all.
public record InvoiceExportRequest(
        @NotNull @Valid CompanyDto company,
        @NotEmpty @Valid List<InvoiceDto> invoices) {
}
