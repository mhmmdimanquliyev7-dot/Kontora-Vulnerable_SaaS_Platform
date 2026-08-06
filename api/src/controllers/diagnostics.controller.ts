import { exec, execFile } from "node:child_process";
import type { Request, Response } from "express";

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
