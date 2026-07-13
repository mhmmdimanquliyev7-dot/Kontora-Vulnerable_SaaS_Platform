<?php

declare(strict_types=1);

// The main API's own dashboard (GET /api/dashboard/summary) already covers
// live current-state totals. This report is the complementary "legacy
// reporting tool" job: historical breakdowns nobody built into the live
// app — monthly trend and a top-clients leaderboard.
function build_revenue_summary(PDO $db, string $companyId): array
{
    $companyStmt = $db->prepare('SELECT id, name FROM companies WHERE id = :companyId');
    $companyStmt->execute(['companyId' => $companyId]);
    $company = $companyStmt->fetch();
    if (!$company) {
        throw new ApiException(404, 'NotFound', 'Company not found.');
    }

    $totalsStmt = $db->prepare(<<<SQL
        SELECT
            COALESCE(SUM(total) FILTER (WHERE status = 'PAID'), 0) AS paid_revenue,
            COALESCE(SUM(total) FILTER (WHERE status IN ('SENT', 'OVERDUE')), 0) AS outstanding
        FROM invoices
        WHERE "companyId" = :companyId
    SQL);
    $totalsStmt->execute(['companyId' => $companyId]);
    $totals = $totalsStmt->fetch();

    $expenseStmt = $db->prepare(
        'SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM expenses WHERE "companyId" = :companyId',
    );
    $expenseStmt->execute(['companyId' => $companyId]);
    $totalExpenses = (float) $expenseStmt->fetch()['total_expenses'];

    $monthlyStmt = $db->prepare(<<<SQL
        SELECT
            to_char(date_trunc('month', "issueDate"), 'YYYY-MM') AS month,
            SUM(total)::numeric AS revenue,
            COUNT(*) AS invoice_count
        FROM invoices
        WHERE "companyId" = :companyId
          AND status = 'PAID'
          AND "issueDate" >= (CURRENT_DATE - INTERVAL '6 months')
        GROUP BY 1
        ORDER BY 1
    SQL);
    $monthlyStmt->execute(['companyId' => $companyId]);
    $monthly = array_map(
        static fn (array $row) => [
            'month' => $row['month'],
            'revenue' => (float) $row['revenue'],
            'invoiceCount' => (int) $row['invoice_count'],
        ],
        $monthlyStmt->fetchAll(),
    );

    $topClientsStmt = $db->prepare(<<<SQL
        SELECT c.id AS client_id, c.name AS client_name, SUM(i.total)::numeric AS total_paid
        FROM invoices i
        JOIN clients c ON c.id = i."clientId"
        WHERE i."companyId" = :companyId AND i.status = 'PAID'
        GROUP BY c.id, c.name
        ORDER BY total_paid DESC
        LIMIT 5
    SQL);
    $topClientsStmt->execute(['companyId' => $companyId]);
    $topClients = array_map(
        static fn (array $row) => [
            'clientId' => $row['client_id'],
            'clientName' => $row['client_name'],
            'totalPaid' => (float) $row['total_paid'],
        ],
        $topClientsStmt->fetchAll(),
    );

    $paidRevenue = (float) $totals['paid_revenue'];
    $outstanding = (float) $totals['outstanding'];

    return [
        'companyId' => $company['id'],
        'companyName' => $company['name'],
        'generatedAt' => gmdate('c'),
        'totals' => [
            'paidRevenue' => $paidRevenue,
            'outstanding' => $outstanding,
            'totalExpenses' => $totalExpenses,
            'netIncome' => $paidRevenue - $totalExpenses,
        ],
        'monthlyRevenue' => $monthly,
        'topClients' => $topClients,
    ];
}
