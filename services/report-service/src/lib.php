<?php

declare(strict_types=1);

// Thrown by any handler to short-circuit with a specific HTTP status + JSON
// body, caught once in index.php so every route gets consistent error shape.
final class ApiException extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
    ) {
        parent::__construct($message);
    }
}

function json_response(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

// Constant-time comparison so a timing attack can't be used to guess the key
// one byte at a time.
function require_internal_api_key(): void
{
    $expected = getenv('INTERNAL_API_KEY');
    $provided = $_SERVER['HTTP_X_INTERNAL_API_KEY'] ?? '';
    if (!$expected || $provided === '' || !hash_equals($expected, $provided)) {
        throw new ApiException(401, 'Unauthorized', 'Missing or invalid internal API key.');
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new ApiException(422, 'ValidationError', 'Request body must be a JSON object.');
    }
    return $decoded;
}

function require_string_field(array $body, string $field): string
{
    $value = $body[$field] ?? null;
    if (!is_string($value) || trim($value) === '') {
        throw new ApiException(422, 'ValidationError', "$field is required.");
    }
    return $value;
}
