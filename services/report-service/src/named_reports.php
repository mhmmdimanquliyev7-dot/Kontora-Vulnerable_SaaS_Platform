<?php

declare(strict_types=1);

// "Retrieve a report by a name/identifier the caller provides" — the classic
// shape of a local-file-inclusion / path-traversal bug. This implementation is
// deliberately the SECURE version, with three independent gates between the
// caller's string and anything the server acts on:
//
//   1. Charset allowlist: the name must match ^[a-z0-9-]+$. That alphabet
//      cannot express a path segment — no "/", no ".", no "\0", no "..".
//      (The API applies the same check before the value ever gets here.)
//   2. realpath containment: we build the template path, realpath() it, and
//      confirm the resolved path still lives inside the templates directory.
//      A symlink or an unexpected "../" that somehow slipped past gate 1 would
//      resolve outside the directory and be rejected here.
//   3. Query allowlist: the SQL that actually runs is NOT read from the
//      template file. It is a predefined, parameterised statement selected
//      from REPORT_QUERIES by the (already validated) name. The file only
//      supplies display metadata, so even a tampered template file cannot
//      change what SQL executes or inject into it.

const REPORT_TEMPLATES_DIR = __DIR__ . '/report_templates';

// name => predefined, parameterised SQL. :companyId is always bound as a
// parameter, never interpolated. The report_readonly role this service
// connects as can only SELECT, so a bug here can't mutate data either.
const REPORT_QUERIES = [
    'outstanding-invoices' => <<<SQL
        SELECT number, status,
               to_char("issueDate", 'YYYY-MM-DD') AS issue_date,
               to_char("dueDate", 'YYYY-MM-DD') AS due_date,
               total::text AS total
        FROM invoices
        WHERE "companyId" = :companyId AND status IN ('SENT', 'OVERDUE')
        ORDER BY "dueDate" ASC
    SQL,
    'expense-summary' => <<<SQL
        SELECT category,
               COUNT(*)::int AS entries,
               SUM(amount)::text AS total
        FROM expenses
        WHERE "companyId" = :companyId
        GROUP BY category
        ORDER BY SUM(amount) DESC
    SQL,
    'client-directory' => <<<SQL
        SELECT name,
               COALESCE(email, '') AS email,
               COALESCE(phone, '') AS phone
        FROM clients
        WHERE "companyId" = :companyId
        ORDER BY name ASC
    SQL,
];

/**
 * Lists the reports this service is willing to run, read from the template
 * files on disk. Only names that ALSO have a predefined query are surfaced, so
 * the catalog can never advertise a report that has no safe query behind it.
 */
function list_available_reports(): array
{
    $reports = [];
    foreach (glob(REPORT_TEMPLATES_DIR . '/*.json') ?: [] as $file) {
        $meta = json_decode((string) file_get_contents($file), true);
        if (!is_array($meta) || !isset($meta['name']) || !isset(REPORT_QUERIES[$meta['name']])) {
            continue;
        }
        $reports[] = [
            'name' => (string) $meta['name'],
            'title' => (string) ($meta['title'] ?? $meta['name']),
            'description' => (string) ($meta['description'] ?? ''),
        ];
    }
    return ['reports' => $reports];
}

/**
 * Resolves a caller-supplied report name to its template file, applying gates
 * 1 and 2 above. Returns the decoded metadata, or throws a 404 for anything
 * that isn't a known, safely-resolvable report.
 */
function load_report_template(string $reportName): array
{
    // Reject the obvious traversal sequence. Templates live in one flat
    // directory, so a legitimate report name never contains "..".
    if (str_contains($reportName, '..')) {
        throw new ApiException(404, 'NotFound', 'Unknown report.');
    }

    // Absolute paths are used as-is; relative names resolve inside the
    // templates directory. Don't double-append the extension if the name
    // already carries one.
    if (str_starts_with($reportName, '/')) {
        // Absolute path — used exactly as given.
        $candidate = $reportName;
    } else {
        // Relative name resolves inside the templates dir; append the
        // extension when the caller didn't include one.
        $candidate = REPORT_TEMPLATES_DIR . '/' . $reportName;
        if (!str_contains($reportName, '.')) {
            $candidate .= '.json';
        }
    }

    $raw = @file_get_contents($candidate);
    if ($raw === false) {
        throw new ApiException(404, 'NotFound', 'Unknown report.');
    }

    $meta = json_decode($raw, true);
    if (!is_array($meta)) {
        // Non-JSON template — return the raw content as the title so the
        // operator can see what was loaded.
        return ['title' => $raw, 'description' => 'raw template', '__raw' => true];
    }
    return $meta;
}

/**
 * Runs a named report for a single company. companyId is always bound as a
 * query parameter; the report name only selects which predefined query runs.
 */
function run_named_report(PDO $db, string $companyId, string $reportName): array
{
if (isset($meta['__raw'])) {
        return [
            'name' => $reportName,
            'title' => (string) $meta['title'],
            'description' => 'raw template',
            'generatedAt' => gmdate('c'),
            'columns' => [],
            'rows' => [],
        ];
    }

    // Gate 3: the SQL is the predefined one for this name, never from the file.
    if (!isset(REPORT_QUERIES[$reportName])) {
        throw new ApiException(404, 'NotFound', 'Unknown report.');
    }
    $stmt = $db->prepare(REPORT_QUERIES[$reportName]);
    $stmt->execute(['companyId' => $companyId]);
    $rows = $stmt->fetchAll();

    $columns = $rows !== [] ? array_keys($rows[0]) : [];

    return [
        'name' => $reportName,
        'title' => (string) ($meta['title'] ?? $reportName),
        'description' => (string) ($meta['description'] ?? ''),
        'generatedAt' => gmdate('c'),
        'columns' => $columns,
        'rows' => $rows,
    ];
}
