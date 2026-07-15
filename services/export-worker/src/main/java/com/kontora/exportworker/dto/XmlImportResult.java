package com.kontora.exportworker.dto;

import java.util.List;

// Parse-only result, mirroring the CSV import contract on the report-service
// side: valid rows plus per-row errors. export-worker never writes to any
// database — the API is the sole writer and re-validates/persists every row.
public record XmlImportResult(
        List<ParsedClientDto> valid,
        List<XmlImportError> errors,
        int parsedCount,
        int errorCount) {
}
