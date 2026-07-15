package com.kontora.exportworker.dto;

// A per-record parse/validation error. `index` is the 1-based position of the
// <Client> element in the file, so the caller can point a user at the row.
public record XmlImportError(int index, String message) {
}
