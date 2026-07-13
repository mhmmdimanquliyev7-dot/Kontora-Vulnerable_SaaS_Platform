<?php

declare(strict_types=1);

// report-service connects with its own least-privilege Postgres role
// (report_readonly — see db/init/01-report-service-role.sh): SELECT only,
// on a handful of tables. It cannot write, even if a bug in this code tried
// to — that's enforced by Postgres itself, not just application logic.
function get_db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = getenv('DATABASE_URL');
    if (!$dsn) {
        throw new RuntimeException('DATABASE_URL is not set.');
    }

    $parts = parse_url($dsn);
    if ($parts === false || !isset($parts['host'], $parts['path'])) {
        throw new RuntimeException('DATABASE_URL is not a valid connection string.');
    }

    $host = $parts['host'];
    $port = $parts['port'] ?? 5432;
    $user = isset($parts['user']) ? urldecode($parts['user']) : '';
    $pass = isset($parts['pass']) ? urldecode($parts['pass']) : '';
    $dbname = ltrim($parts['path'], '/');

    $pdo = new PDO(
        "pgsql:host=$host;port=$port;dbname=$dbname",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ],
    );

    return $pdo;
}
