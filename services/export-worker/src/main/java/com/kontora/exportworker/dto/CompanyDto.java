package com.kontora.exportworker.dto;

import jakarta.validation.constraints.NotBlank;

public record CompanyDto(
        @NotBlank String id,
        @NotBlank String name,
        String address) {
}
