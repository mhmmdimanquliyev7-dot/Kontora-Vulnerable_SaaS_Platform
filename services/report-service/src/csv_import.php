<?php

declare(strict_types=1);

// Parses (never persists — this service has no write access to the
// database) an uploaded CSV into a header row + data rows. Returns null if
// the file can't be read as CSV at all.
function parse_csv_file(string $path): ?array
{
    $handle = fopen($path, 'r');
    if ($handle === false) {
        return null;
    }

    $header = fgetcsv($handle);
    if ($header === false || $header === null) {
        fclose($handle);
        return null;
    }

    $rows = [];
    while (($row = fgetcsv($handle)) !== false) {
        if ($row === [null] || (count($row) === 1 && trim((string) $row[0]) === '')) {
            continue; // blank trailing line
        }
        $rows[] = $row;
    }
    fclose($handle);

    return [array_map(static fn ($h) => strtolower(trim((string) $h)), $header), $rows];
}

function require_uploaded_file(array $files): string
{
    if (!isset($files['file']) || $files['file']['error'] !== UPLOAD_ERR_OK) {
        throw new ApiException(422, 'ValidationError', 'A CSV file upload (field "file") is required.');
    }
    return $files['file']['tmp_name'];
}

/**
 * Expected columns: name (required), email, phone, billingaddress.
 * Row-level errors are collected, not fatal — the caller decides what to do
 * with a partially-valid file.
 */
function handle_client_import(array $files): array
{
    $tmpPath = require_uploaded_file($files);
    $parsed = parse_csv_file($tmpPath);
    if ($parsed === null) {
        throw new ApiException(422, 'ValidationError', 'Could not read the uploaded file as CSV.');
    }
    [$header, $rows] = $parsed;

    $valid = [];
    $errors = [];

    foreach ($rows as $i => $row) {
        $line = $i + 2; // +1 for header, +1 for 1-indexing
        $record = @array_combine($header, $row);
        if ($record === false) {
            $errors[] = ['line' => $line, 'message' => 'Column count does not match the header row.'];
            continue;
        }

        $name = trim((string) ($record['name'] ?? ''));
        if ($name === '') {
            $errors[] = ['line' => $line, 'message' => 'Missing required "name" column.'];
            continue;
        }
        if (mb_strlen($name) > 200) {
            $errors[] = ['line' => $line, 'message' => 'name exceeds 200 characters.'];
            continue;
        }

        $email = trim((string) ($record['email'] ?? ''));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = ['line' => $line, 'message' => "Invalid email: $email"];
            continue;
        }

        $valid[] = [
            'name' => $name,
            'email' => $email !== '' ? $email : null,
            'phone' => trim((string) ($record['phone'] ?? '')) ?: null,
            'billingAddress' => trim((string) ($record['billingaddress'] ?? '')) ?: null,
        ];
    }

    return ['valid' => $valid, 'errors' => $errors, 'importedCount' => count($valid), 'errorCount' => count($errors)];
}

/**
 * Expected columns: category (required), description (required),
 * amount (required, positive number), date (required, parseable date).
 */
function handle_expense_import(array $files): array
{
    $tmpPath = require_uploaded_file($files);
    $parsed = parse_csv_file($tmpPath);
    if ($parsed === null) {
        throw new ApiException(422, 'ValidationError', 'Could not read the uploaded file as CSV.');
    }
    [$header, $rows] = $parsed;

    $valid = [];
    $errors = [];

    foreach ($rows as $i => $row) {
        $line = $i + 2;
        $record = @array_combine($header, $row);
        if ($record === false) {
            $errors[] = ['line' => $line, 'message' => 'Column count does not match the header row.'];
            continue;
        }

        $category = trim((string) ($record['category'] ?? ''));
        $description = trim((string) ($record['description'] ?? ''));
        if ($category === '' || $description === '') {
            $errors[] = ['line' => $line, 'message' => 'category and description are required.'];
            continue;
        }

        $amountRaw = trim((string) ($record['amount'] ?? ''));
        if (!is_numeric($amountRaw) || (float) $amountRaw <= 0) {
            $errors[] = ['line' => $line, 'message' => "Invalid amount: \"$amountRaw\""];
            continue;
        }

        $dateRaw = trim((string) ($record['date'] ?? ''));
        $date = DateTime::createFromFormat('Y-m-d', $dateRaw) ?: date_create($dateRaw);
        if ($date === false) {
            $errors[] = ['line' => $line, 'message' => "Invalid date: \"$dateRaw\""];
            continue;
        }

        $valid[] = [
            'category' => $category,
            'description' => $description,
            'amount' => (float) $amountRaw,
            'date' => $date->format('Y-m-d'),
        ];
    }

    return ['valid' => $valid, 'errors' => $errors, 'importedCount' => count($valid), 'errorCount' => count($errors)];
}
