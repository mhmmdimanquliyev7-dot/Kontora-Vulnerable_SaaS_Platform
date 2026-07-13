package com.kontora.exportworker.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

public record InvoiceDto(
        @NotBlank String id,
        @NotBlank String number,
        @NotBlank String status,
        @NotBlank String issueDate,
        @NotBlank String dueDate,
        @NotBlank String currency,
        @NotNull BigDecimal subtotal,
        @NotNull BigDecimal tax,
        @NotNull BigDecimal total,
        String notes,
        @NotNull @Valid ClientDto client,
        @NotEmpty @Valid List<LineItemDto> items) {
}
