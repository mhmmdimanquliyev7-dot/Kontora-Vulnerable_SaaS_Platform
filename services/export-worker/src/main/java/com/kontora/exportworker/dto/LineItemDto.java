package com.kontora.exportworker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record LineItemDto(
        @NotBlank String description,
        @NotNull BigDecimal quantity,
        @NotNull BigDecimal unitPrice,
        @NotNull BigDecimal amount) {
}
