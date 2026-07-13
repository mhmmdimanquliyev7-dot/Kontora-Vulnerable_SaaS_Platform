package com.kontora.exportworker.dto;

import jakarta.validation.constraints.NotBlank;

public record ClientDto(
        @NotBlank String id,
        @NotBlank String name,
        String email) {
}
