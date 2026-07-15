package com.kontora.exportworker.dto;

// One parsed client row from an import XML file. Nullable fields are emitted
// as JSON null; the API maps those to "absent" when it writes the record.
public record ParsedClientDto(
        String name,
        String email,
        String phone,
        String billingAddress) {
}
