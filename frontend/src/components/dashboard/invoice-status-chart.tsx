"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Invoice, InvoiceStatus } from "@/lib/api/types";

const STATUS_ORDER: InvoiceStatus[] = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"];

const STATUS_META: Record<InvoiceStatus, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "var(--status-neutral)" },
  SENT: { label: "Sent", color: "var(--status-warning)" },
  PAID: { label: "Paid", color: "var(--status-good)" },
  OVERDUE: { label: "Overdue", color: "var(--status-critical)" },
  VOID: { label: "Void", color: "var(--status-neutral)" },
};

const chartConfig: ChartConfig = {
  count: { label: "Invoices" },
};

export function InvoiceStatusChart({ invoices }: { invoices: Invoice[] }) {
  const data = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_META[status].label,
    count: invoices.filter((invoice) => invoice.status === status).length,
  }));

  const hasData = invoices.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invoices by status</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={data} margin={{ left: 0, right: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={28}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_META[entry.status].color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No invoices yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
