<?php

declare(strict_types=1);

// report-service — internal-only legacy reporting/import tool.
// Not reachable from outside the Docker network; every route past /health
// requires the shared X-Internal-Api-Key header (see lib.php).

require __DIR__ . '/lib.php';
require __DIR__ . '/db.php';
require __DIR__ . '/reports.php';
require __DIR__ . '/csv_import.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$path = rtrim((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
if ($path === '') {
    $path = '/';
}

try {
    if ($method === 'GET' && $path === '/health') {
        json_response(200, ['status' => 'ok', 'service' => 'report-service']);
    }

    if ($method === 'POST' && $path === '/reports/revenue-summary') {
        require_internal_api_key();
        $body = read_json_body();
        $companyId = require_string_field($body, 'companyId');
        json_response(200, build_revenue_summary(get_db(), $companyId));
    }

    if ($method === 'POST' && $path === '/import/clients') {
        require_internal_api_key();
        json_response(200, handle_client_import($_FILES));
    }

    if ($method === 'POST' && $path === '/import/expenses') {
        require_internal_api_key();
        json_response(200, handle_expense_import($_FILES));
    }

    json_response(404, ['error' => 'NotFound', 'message' => "No route matches $method $path"]);
} catch (ApiException $e) {
    json_response($e->status, ['error' => $e->errorCode, 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('report-service error: ' . $e->getMessage());
    json_response(500, ['error' => 'InternalServerError', 'message' => 'Something went wrong.']);
}
