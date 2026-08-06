import { exec, execFile } from "node:child_process";
import { promises as dns } from "node:dns";
import type { Request, Response } from "express";

import { env } from "@/config/env.js";
import { prisma } from "@/lib/prisma.js";
import { redis } from "@/lib/redis.js";

// Chapter 13 — "System Diagnostics" command-injection lab (INTENTIONALLY
// VULNERABLE, training only). The user-controlled value is placed at the END of
// each constructed command on purpose. No validation/escaping is applied here
// by design; the ONLY control is the OWNER role guard on the router (see
// diagnostics.routes.ts).

// Endpoint 1 — ping (in-band / verbose): returns stdout+stderr verbatim.
export function ping(req: Request, res: Response): void {
  const { host } = req.body ?? {};
  exec(`ping -c 4 ${host}`, { timeout: 15000 }, (_err, stdout, stderr) => {
    res.json({ command: `ping -c 4 ${host}`, output: `${stdout}${stderr}` });
  });
}

// Endpoint 2 — connectivity (blind / time-based / OAST): output is discarded;
// only a boolean is returned. No stdout/stderr ever reaches the client.
export function connectivity(req: Request, res: Response): void {
  const { url } = req.body ?? {};
  exec(
    `curl -s -o /dev/null -w "%{http_code}" --max-time 10 ${url}`,
    { timeout: 20000 },
    (_err, stdout) => {
      res.json({ reachable: /^2\d\d$/.test((stdout || "").trim()) });
    },
  );
}

// Endpoint 3 — ping-strict (filter bypass): a naive character blacklist, then
// the same vulnerable exec as endpoint 1. Newline and `${` are deliberately
// NOT blocked — the bypass depends on them.
export function pingStrict(req: Request, res: Response): void {
  const { host } = req.body ?? {};
  const BLOCKED = [";", "&&", "||", "|", "&", "$(", "`", " ", "\t"];
  if (BLOCKED.some((t) => host.includes(t))) {
    res.status(400).json({ error: "Invalid characters in host" });
    return;
  }
  exec(`ping -c 4 ${host}`, { timeout: 15000 }, (_err, stdout, stderr) => {
    res.json({ command: `ping -c 4 ${host}`, output: `${stdout}${stderr}` });
  });
}

// Endpoint 4 — fetch-remote (argument injection): execFile with no shell, but
// the user string is split on spaces and spread in as separate args with no
// `--` separator, leaving it wide open to curl argument injection.
export function fetchRemote(req: Request, res: Response): void {
  const { target } = req.body ?? {};
  const parts = target.split(" ");
  execFile(
    "curl",
    ["-s", "--max-time", "10", ...parts],
    { timeout: 20000 },
    (_err, stdout, stderr) => {
      res.json({ output: `${stdout || ""}${stderr || ""}` });
    },
  );
}

// ===========================================================================
// Realism pass — genuinely SAFE, read-only diagnostic panels.
// These are NOT part of the command-injection lab: no child_process, no shell,
// no command string is ever built from input. They use only Node stdlib
// (dns/process) and read-only Prisma/Redis queries, so nothing below is
// exploitable. Same OWNER guard as the endpoints above.
// ===========================================================================

interface ServiceStatus {
  name: string;
  status: string;
}

// A. Service health — process uptime plus per-service status. Database and
// cache are probed with a parameterless SELECT 1 / PING (no user input goes
// anywhere near them); everything else reports operational. No request input.
export async function health(_req: Request, res: Response): Promise<void> {
  let database = "operational";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "degraded";
  }

  let cache = "operational";
  try {
    await redis.ping();
  } catch {
    cache = "degraded";
  }

  const services: ServiceStatus[] = [
    { name: "API", status: "operational" },
    { name: "Database", status: database },
    { name: "Background jobs", status: "operational" },
    { name: "File storage", status: "operational" },
    { name: "Cache", status: cache },
  ];

  res.json({ uptimeSeconds: Math.floor(process.uptime()), services });
}

// B. Integration status — read-only. Derived from real data where trivial
// (whether webhooks exist + their last delivery, whether SMTP is configured);
// plausible fixed values otherwise. No input, no side effects.
export async function integrations(req: Request, res: Response): Promise<void> {
  const companyId = req.auth!.companyId;

  const webhookCount = await prisma.webhook.count({ where: { companyId } });
  const lastDelivery = await prisma.webhookDelivery.findFirst({
    where: { webhook: { companyId } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const now = Date.now();
  const list = [
    { name: "Payments", connected: false, lastSyncedAt: null as string | null },
    {
      name: "Email / SMTP",
      connected: Boolean(env.SMTP_HOST),
      lastSyncedAt: env.SMTP_HOST ? new Date(now - 42 * 60 * 1000).toISOString() : null,
    },
    {
      name: "Webhooks",
      connected: webhookCount > 0,
      lastSyncedAt: lastDelivery?.createdAt.toISOString() ?? null,
    },
    {
      name: "Accounting export",
      connected: true,
      lastSyncedAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
    },
  ];

  res.json({ integrations: list });
}

// C. Email / DNS records lookup — Node dns.promises ONLY. The domain is used
// exclusively as a DNS query name; it is never passed to a shell or used to
// build a command, so this is NOT command-injectable. Every lookup is wrapped
// so a failure yields "not found" rather than throwing.
export async function dnsRecords(req: Request, res: Response): Promise<void> {
  const { domain } = req.body ?? {};

  let mx: { exchange: string; priority: number }[] = [];
  try {
    mx = await dns.resolveMx(domain);
  } catch {
    mx = [];
  }

  let spf: string | null = null;
  try {
    const txt = await dns.resolveTxt(domain);
    spf =
      txt.map((chunks) => chunks.join("")).find((r) => r.toLowerCase().startsWith("v=spf1")) ??
      null;
  } catch {
    spf = null;
  }

  let dmarc: string | null = null;
  try {
    const txt = await dns.resolveTxt(`_dmarc.${domain}`);
    dmarc =
      txt.map((chunks) => chunks.join("")).find((r) => r.toLowerCase().startsWith("v=dmarc1")) ??
      null;
  } catch {
    dmarc = null;
  }

  res.json({ mx, spf, dmarc });
}

// D. Plan usage — read-only counts derived from existing models where trivial;
// plan name is a plausible fixed value. No input.
export async function usage(req: Request, res: Response): Promise<void> {
  const companyId = req.auth!.companyId;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const invoicesThisMonth = await prisma.invoice.count({
    where: { companyId, createdAt: { gte: startOfMonth } },
  });
  const apiCallsThisMonth = await prisma.activityLog.count({
    where: { companyId, createdAt: { gte: startOfMonth } },
  });
  const storage = await prisma.invoiceAttachment.aggregate({
    _sum: { sizeBytes: true },
    where: { companyId },
  });
  const storageUsedMb =
    Math.round(((storage._sum.sizeBytes ?? 0) / (1024 * 1024)) * 10) / 10;

  res.json({ plan: "Business", invoicesThisMonth, apiCallsThisMonth, storageUsedMb });
}
