import type { KontoraIdAccount } from "@/store.js";

// Every dynamic value rendered into these pages goes through escapeHtml. The
// pages are tiny and hand-built (no template engine), so escaping is explicit
// rather than implicit — the values that reach them (state, redirect_uri,
// error text) are attacker-influenceable by construction.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLE = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
         background:#f6f7fb; color:#1c2033; padding:24px; }
  .card { width:100%; max-width:420px; background:#fff; border:1px solid #e6e8f0; border-radius:16px;
          padding:28px; box-shadow:0 8px 30px rgba(20,20,50,.08); }
  .brand { display:flex; align-items:center; gap:10px; margin-bottom:20px; }
  .mark { width:32px; height:32px; border-radius:9px; background:linear-gradient(135deg,#4f45e8,#7c3aed);
          color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center; }
  h1 { font-size:18px; margin:0 0 6px; }
  p.sub { margin:0 0 18px; color:#5b6178; font-size:14px; }
  .who { border:1px solid #e6e8f0; border-radius:10px; padding:10px 12px; margin-bottom:8px;
         display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .who strong { display:block; font-size:14px; }
  .who span { color:#5b6178; font-size:12px; }
  button { border:0; border-radius:8px; background:#4f45e8; color:#fff; font-weight:600;
           padding:8px 14px; cursor:pointer; font-size:13px; }
  button:hover { background:#4038c9; }
  .scope { background:#f6f7fb; border-radius:10px; padding:12px; font-size:13px; color:#5b6178; margin-bottom:16px; }
  .err { border:1px solid #f3c2c2; background:#fdf2f2; color:#a52222; border-radius:10px; padding:12px 14px; font-size:13px; margin-bottom:14px; }
  code { font-family: ui-monospace, monospace; font-size:12px; word-break:break-all; }
  .avatar { width:40px; height:40px; border-radius:50%; background:#e9e9f6; color:#4f45e8; font-weight:700;
            display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:15px; }
  .idcard { display:flex; align-items:center; gap:12px; border:1px solid #e6e8f0; border-radius:12px;
            padding:12px 14px; margin-bottom:16px; }
  .idcard strong { display:block; font-size:14px; }
  .idcard span { color:#5b6178; font-size:12px; }
  label { display:block; font-size:12px; font-weight:600; color:#3a3f57; margin:0 0 6px; }
  input[type=password] { width:100%; padding:9px 11px; border:1px solid #d6d9e6; border-radius:8px;
                         font-size:14px; margin-bottom:6px; }
  input[type=password]:focus { outline:2px solid #c7c3f5; border-color:#8a82ef; }
  button.block { width:100%; padding:10px; font-size:14px; margin-top:6px; }
  button.link, a.link { background:none; border:0; color:#4f45e8; font-weight:600; font-size:13px;
                        cursor:pointer; padding:8px 0 0; text-decoration:none; }
  button.link:hover, a.link:hover { text-decoration:underline; background:none; }
  .hint { font-size:12px; color:#8a90a6; margin-top:10px; }
  .divider { border:0; border-top:1px solid #eceef5; margin:16px 0; }
`;

function page(title: string, inner: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${STYLE}</style></head>
<body><div class="card">
<div class="brand"><div class="mark">K</div><strong>Kontora ID</strong></div>
${inner}
</div></body></html>`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function hidden(name: string, value: string): string {
  return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`;
}

// Screen 1 (no active IdP session): choose which account to sign in as. Picking
// one leads to the password screen — no code is issued here.
export function chooserPage(
  requestId: string,
  clientLabel: string,
  scope: string,
  accounts: KontoraIdAccount[],
): string {
  const rows = accounts
    .map(
      (a) => `<form method="POST" action="/authorize/password" class="who">
  ${hidden("request_id", requestId)}
  ${hidden("sub", a.sub)}
  <div style="display:flex;align-items:center;gap:10px;">
    <div class="avatar">${escapeHtml(initials(a.name))}</div>
    <div>
      <strong>${escapeHtml(a.name)}</strong>
      <span>${escapeHtml(a.email)}${a.emailVerified ? "" : " · unverified"}</span>
    </div>
  </div>
  <button type="submit">Continue</button>
</form>`,
    )
    .join("\n");

  return page(
    "Sign in — Kontora ID",
    `<h1>Sign in to ${escapeHtml(clientLabel)}</h1>
     <p class="sub">Choose an account to continue.</p>
     <div class="scope"><strong>${escapeHtml(clientLabel)}</strong> will receive: ${escapeHtml(scope)}</div>
     ${rows}`,
  );
}

// Screen 2: password prompt for the chosen account. This is the gate — no
// authorization code is minted until this succeeds.
export function passwordPage(
  requestId: string,
  account: KontoraIdAccount,
  clientLabel: string,
  mockPassword: string,
  error?: string,
): string {
  return page(
    "Enter your password — Kontora ID",
    `<h1>Welcome</h1>
     <p class="sub">Sign in to continue to ${escapeHtml(clientLabel)}.</p>
     <div class="idcard">
       <div class="avatar">${escapeHtml(initials(account.name))}</div>
       <div><strong>${escapeHtml(account.name)}</strong><span>${escapeHtml(account.email)}</span></div>
     </div>
     ${error ? `<div class="err">${escapeHtml(error)}</div>` : ""}
     <form method="POST" action="/authorize/login">
       ${hidden("request_id", requestId)}
       ${hidden("sub", account.sub)}
       <label for="password">Password</label>
       <input id="password" name="password" type="password" autocomplete="current-password" autofocus required>
       <button type="submit" class="block">Continue</button>
     </form>
     <form method="POST" action="/authorize/switch">
       ${hidden("request_id", requestId)}
       <button type="submit" class="link">Use another account</button>
     </form>
     <p class="hint">Demo identity provider — the password for every account is <code>${escapeHtml(mockPassword)}</code>.</p>`,
  );
}

// Screen 3 (active IdP session): the real "Continue as X" experience — one
// click, no password, because this browser already authenticated within the TTL.
export function continueAsPage(
  requestId: string,
  account: KontoraIdAccount,
  clientLabel: string,
  scope: string,
): string {
  return page(
    "Continue — Kontora ID",
    `<h1>Continue to ${escapeHtml(clientLabel)}</h1>
     <p class="sub">You're signed in to Kontora ID.</p>
     <div class="idcard">
       <div class="avatar">${escapeHtml(initials(account.name))}</div>
       <div><strong>${escapeHtml(account.name)}</strong><span>${escapeHtml(account.email)}</span></div>
     </div>
     <div class="scope"><strong>${escapeHtml(clientLabel)}</strong> will receive: ${escapeHtml(scope)}</div>
     <form method="POST" action="/authorize/approve">
       ${hidden("request_id", requestId)}
       <button type="submit" class="block">Continue as ${escapeHtml(account.name.split(/\s+/)[0] ?? account.name)}</button>
     </form>
     <hr class="divider">
     <form method="POST" action="/authorize/switch">
       ${hidden("request_id", requestId)}
       <button type="submit" class="link">Sign in with a different account</button>
     </form>`,
  );
}

// Rendered instead of redirecting when the redirect_uri or client_id can't be
// trusted. Per RFC 6749 §4.1.2.1 the server MUST NOT redirect back to an
// unregistered/invalid redirect_uri — doing so is exactly how a provider gets
// turned into an open redirector.
export function errorPage(message: string, detail?: string): string {
  return page(
    "Error — Kontora ID",
    `<h1>Can't continue</h1>
     <div class="err">${escapeHtml(message)}${detail ? `<br><code>${escapeHtml(detail)}</code>` : ""}</div>`,
  );
}
