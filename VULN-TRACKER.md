# Kontora — Vulnerability Coverage & Injection Tracker

The master roadmap for the vulnerability-injection phase. Every class, every
variant, mapped to the Kontora feature that hosts it, with OWASP mapping and
report status.

**How to use:** as you inject and document each variant, tick its boxes.
Keep this file in the repo root and commit updates alongside each injection.

## Legend
- **Env** — 🏠 doable locally · 🌐 needs VPS/domain + public callback (out-of-band / real infra)
- **Status columns:** `Inj` = injected · `Exp` = exploited/verified · `Rpt` = report written
- Mark with `x` (e.g. `[x]`) when done.

## Environment note
Everything is *documented* on the deployed VPS (real domain) for report
consistency. 🌐 rows additionally *require* the public server + a callback
catcher (self-hosted OAST listener, interact.sh, or Burp Collaborator) to
function at all.

---

## 1. SQL Injection — host: client/invoice search, filters, login, report-service, GraphQL
OWASP: 2025 A05 · 2021 A03 · 2017 A1

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| UNION-based | 🏠 | [ ] | [ ] | [ ] |
| Error-based | 🏠 | [ ] | [ ] | [ ] |
| Boolean-based blind | 🏠 | [ ] | [ ] | [ ] |
| Time-based blind | 🏠 | [ ] | [ ] | [ ] |
| Out-of-band (OAST) | 🌐 | [ ] | [ ] | [ ] |
| Second-order | 🏠 | [ ] | [ ] | [ ] |
| Different contexts (WHERE/ORDER BY/INSERT/UPDATE) | 🏠 | [ ] | [ ] | [ ] |
| WAF/filter bypass | 🏠 | [ ] | [ ] | [ ] |

## 2. NoSQL Injection — host: MongoDB invoice comments
OWASP: 2025 A05 · 2021 A03 · 2017 A1

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Operator injection ($ne/$gt, auth bypass) | 🏠 | [ ] | [ ] | [ ] |
| Boolean-based blind | 🏠 | [ ] | [ ] | [ ] |
| Time-based blind | 🏠 | [ ] | [ ] | [ ] |
| JavaScript injection ($where) | 🏠 | [ ] | [ ] | [ ] |

## 3. Cross-Site Scripting (XSS) — host: blog, comments, notes, profile, search
OWASP: 2025 A05 · 2021 A03 · 2017 A7

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Reflected | 🏠 | [ ] | [ ] | [ ] |
| Stored | 🏠 | [ ] | [ ] | [ ] |
| DOM-based | 🏠 | [ ] | [ ] | [ ] |
| Blind XSS | 🌐 | [ ] | [ ] | [ ] |
| Filter/sanitizer bypass | 🏠 | [ ] | [ ] | [ ] |
| Context-specific (HTML/attr/JS/URL) | 🏠 | [ ] | [ ] | [ ] |

## 4. Command Injection — host: document/report generation, image processing
OWASP: 2025 A05 · 2021 A03 · 2017 A1

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| In-band / verbose | 🏠 | [ ] | [ ] | [ ] |
| Blind | 🏠 | [ ] | [ ] | [ ] |
| Time-based blind | 🏠 | [ ] | [ ] | [ ] |
| Out-of-band (OAST) | 🌐 | [ ] | [ ] | [ ] |
| Filter bypass (spaces/blacklist/encoding) | 🏠 | [ ] | [ ] | [ ] |
| Argument / null-byte injection | 🏠 | [ ] | [ ] | [ ] |

## 5. Path Traversal / File Inclusion — host: PHP report-service, attachments
OWASP: 2025 A01 · 2021 A01 · 2017 A5

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Basic traversal | 🏠 | [ ] | [ ] | [ ] |
| Absolute path | 🏠 | [ ] | [ ] | [ ] |
| Encoding bypass (URL/double/Unicode) | 🏠 | [ ] | [ ] | [ ] |
| Null-byte / extension bypass | 🏠 | [ ] | [ ] | [ ] |
| PHP wrappers (php://filter, data://, expect://) | 🏠 | [ ] | [ ] | [ ] |
| LFI → RCE via log poisoning | 🏠 | [ ] | [ ] | [ ] |
| RFI (remote file inclusion) | 🌐 | [ ] | [ ] | [ ] |

## 6. SSRF — host: webhooks, avatar-from-URL
OWASP: 2025 A10 · 2021 A10 · 2017 (n/a standalone)

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Basic (fetch internal service) | 🏠 | [ ] | [ ] | [ ] |
| Blind SSRF | 🌐 | [ ] | [ ] | [ ] |
| Cloud metadata (169.254.169.254) | 🏠 | [ ] | [ ] | [ ] |
| Filter bypass (encoding/redirect/DNS rebinding) | 🏠 | [ ] | [ ] | [ ] |
| SSRF via redirect | 🏠 | [ ] | [ ] | [ ] |

## 7. XXE Injection — host: Java XML import
OWASP: 2025 A05 · 2021 A05 · 2017 A4

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| In-band (file read in response) | 🏠 | [ ] | [ ] | [ ] |
| Blind XXE | 🌐 | [ ] | [ ] | [ ] |
| Out-of-band XXE (external DTD) | 🌐 | [ ] | [ ] | [ ] |
| XInclude / SVG-upload XXE | 🏠 | [ ] | [ ] | [ ] |
| Parameter entity variants | 🏠 | [ ] | [ ] | [ ] |

## 8. Server-Side Template Injection (SSTI) — host: blog rendering, report templates
OWASP: 2025 A05 · 2021 A03 · 2017 A1

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Detection / basic injection | 🏠 | [ ] | [ ] | [ ] |
| Information disclosure | 🏠 | [ ] | [ ] | [ ] |
| SSTI → RCE | 🏠 | [ ] | [ ] | [ ] |
| Sandbox escape / filter bypass | 🏠 | [ ] | [ ] | [ ] |

## 9. Access Control / IDOR — host: client portal, invoice IDs, roles, tenant isolation
OWASP: 2025 A01 · 2021 A01 · 2017 A5

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| IDOR (direct object reference) | 🏠 | [ ] | [ ] | [ ] |
| Horizontal priv-esc (cross-user) | 🏠 | [ ] | [ ] | [ ] |
| Vertical priv-esc (user→admin) | 🏠 | [ ] | [ ] | [ ] |
| Cross-tenant access | 🏠 | [ ] | [ ] | [ ] |
| Forced browsing / hidden endpoints | 🏠 | [ ] | [ ] | [ ] |
| Parameter/method-based bypass | 🏠 | [ ] | [ ] | [ ] |

## 10. Authentication — host: login, password reset, JWT
OWASP: 2025 A07 · 2021 A07 · 2017 A2

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Credential brute-force / weak lockout | 🏠 | [ ] | [ ] | [ ] |
| Username enumeration | 🏠 | [ ] | [ ] | [ ] |
| Password reset flaws (token predict/reuse) | 🏠 | [ ] | [ ] | [ ] |
| MFA bypass (if added) | 🏠 | [ ] | [ ] | [ ] |
| Session fixation | 🏠 | [ ] | [ ] | [ ] |
| Auth-flow logic flaws | 🏠 | [ ] | [ ] | [ ] |

## 11. JWT Attacks — host: auth tokens
OWASP: 2025 A07/A04 · 2021 A07/A02 · 2017 A2

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| alg:none bypass | 🏠 | [ ] | [ ] | [ ] |
| Weak secret / signature brute-force | 🏠 | [ ] | [ ] | [ ] |
| Algorithm confusion (RS256→HS256) | 🏠 | [ ] | [ ] | [ ] |
| kid / jku header injection | 🏠 | [ ] | [ ] | [ ] |
| Unverified signature | 🏠 | [ ] | [ ] | [ ] |

## 12. OAuth — host: Kontora ID SSO
OWASP: 2025 A07 · 2021 A07 · 2017 A2

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| redirect_uri manipulation | 🏠 | [ ] | [ ] | [ ] |
| CSRF (missing state) | 🏠 | [ ] | [ ] | [ ] |
| Auth code theft/reuse | 🏠 | [ ] | [ ] | [ ] |
| Scope/token leakage | 🏠 | [ ] | [ ] | [ ] |
| Account takeover via redirect | 🌐 | [ ] | [ ] | [ ] |

## 13. Business Logic — host: invoice/pay flow, coupons, status
OWASP: 2025 A06 · 2021 A04 · 2017 (n/a standalone)

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Price/total tampering | 🏠 | [ ] | [ ] | [ ] |
| Negative amounts / integer overflow | 🏠 | [ ] | [ ] | [ ] |
| Workflow bypass (skip steps) | 🏠 | [ ] | [ ] | [ ] |
| Insufficient state-transition validation | 🏠 | [ ] | [ ] | [ ] |

## 14. Race Conditions — host: pay flow, coupon redemption, status change
OWASP: 2025 A06 · 2021 A04 · 2017 (n/a)

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Limit-overrun (double-pay/redeem) | 🏠 | [ ] | [ ] | [ ] |
| TOCTOU | 🏠 | [ ] | [ ] | [ ] |
| Single-packet-attack timing | 🏠 | [ ] | [ ] | [ ] |

## 15. File Upload — host: logo, blog images, attachments
OWASP: 2025 A05 · 2021 A05/A03 · 2017 A6

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Web shell upload (bypass type checks) | 🏠 | [ ] | [ ] | [ ] |
| Extension/MIME bypass | 🏠 | [ ] | [ ] | [ ] |
| Content-type spoofing | 🏠 | [ ] | [ ] | [ ] |
| Path traversal in filename | 🏠 | [ ] | [ ] | [ ] |
| SVG / polyglot → XSS/XXE | 🏠 | [ ] | [ ] | [ ] |

## 16. Insecure Deserialization — host: PHP service, session handling
OWASP: 2025 A08 · 2021 A08 · 2017 A8

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| PHP object injection | 🏠 | [ ] | [ ] | [ ] |
| Gadget chains → RCE | 🏠 | [ ] | [ ] | [ ] |
| Java deserialization (if applicable) | 🏠 | [ ] | [ ] | [ ] |

## 17. Web LLM Attacks — host: AI assistant
OWASP: 2025 (LLM-adjacent) · maps loosely to A05/A08

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Prompt injection (leak system prompt) | 🏠 | [ ] | [ ] | [ ] |
| Indirect prompt injection (via stored data) | 🏠 | [ ] | [ ] | [ ] |
| Jailbreak / instruction override | 🏠 | [ ] | [ ] | [ ] |
| Data exfiltration via assistant | 🏠 | [ ] | [ ] | [ ] |

## 18. GraphQL — host: /graphql endpoint
OWASP: 2025 A05/A01 · 2021 A03/A01

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Introspection abuse | 🏠 | [ ] | [ ] | [ ] |
| Batching attacks / brute-force | 🏠 | [ ] | [ ] | [ ] |
| Authorization bypass via GraphQL | 🏠 | [ ] | [ ] | [ ] |
| DoS via nested queries | 🏠 | [ ] | [ ] | [ ] |

## 19. WebSockets — host: real-time assistant
OWASP: 2025 A01/A07 · 2021 A01

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Cross-Site WebSocket Hijacking (CSWSH) | 🌐 | [ ] | [ ] | [ ] |
| Message tampering | 🏠 | [ ] | [ ] | [ ] |
| Auth bypass on WS handshake | 🏠 | [ ] | [ ] | [ ] |

## 20. CSRF — host: state-changing forms
OWASP: 2025 A01 · 2021 A01 · 2017 A6(2013 A8)

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Classic CSRF (missing token) | 🏠 | [ ] | [ ] | [ ] |
| SameSite bypass | 🏠 | [ ] | [ ] | [ ] |
| Token validation flaws | 🏠 | [ ] | [ ] | [ ] |

## 21. CORS — host: API CORS config
OWASP: 2025 A02 · 2021 A05 · 2017 A6

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Reflected origin / wildcard misconfig | 🏠 | [ ] | [ ] | [ ] |
| null origin trust | 🏠 | [ ] | [ ] | [ ] |
| Credentialed CORS abuse | 🏠 | [ ] | [ ] | [ ] |

## 22. Clickjacking — host: app frames
OWASP: 2025 A02 · 2021 A05 · 2017 A6

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Missing frame headers | 🏠 | [ ] | [ ] | [ ] |
| UI redressing | 🏠 | [ ] | [ ] | [ ] |

## 23. Prototype Pollution — host: Node input merging
OWASP: 2025 A03(supply-chain)/A05 · 2021 A06/A03

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Server-side prototype pollution | 🏠 | [ ] | [ ] | [ ] |
| Client-side PP → DOM XSS | 🏠 | [ ] | [ ] | [ ] |

## 24. HTTP Host Header Attacks — host: password-reset links, routing
OWASP: 2025 A02/A10 · 2021 A05/A10

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Password-reset poisoning | 🌐 | [ ] | [ ] | [ ] |
| Cache poisoning via Host | 🌐 | [ ] | [ ] | [ ] |
| Routing-based SSRF via Host | 🌐 | [ ] | [ ] | [ ] |

## 25. Information Disclosure — host: errors, activity log, API
OWASP: 2025 A09/A02 · 2021 A01/A05 · 2017 A3

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Verbose error messages | 🏠 | [ ] | [ ] | [ ] |
| Debug / stack traces | 🏠 | [ ] | [ ] | [ ] |
| Sensitive data in responses | 🏠 | [ ] | [ ] | [ ] |
| Source / backup file exposure | 🏠 | [ ] | [ ] | [ ] |

## 26. HTTP Request Smuggling — host: nginx → backend (needs config) 🌐
OWASP: 2025 A08/A02 · 2021 A08/A05

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| CL.TE | 🌐 | [ ] | [ ] | [ ] |
| TE.CL | 🌐 | [ ] | [ ] | [ ] |
| TE.TE | 🌐 | [ ] | [ ] | [ ] |

## 27. Web Cache Poisoning / Deception — host: nginx cache (needs config) 🌐
OWASP: 2025 A02 · 2021 A05

| Variant | Env | Inj | Exp | Rpt |
|---|---|---|---|---|
| Cache poisoning (unkeyed input) | 🌐 | [ ] | [ ] | [ ] |
| Cache deception (path confusion) | 🌐 | [ ] | [ ] | [ ] |

---

## OWASP Top 10 coverage summary

**2025 (release candidate — re-verify final list):** A01 Broken Access Control ·
A02 Security Misconfiguration · A03 Software Supply Chain · A04 Cryptographic
Failures · A05 Injection · A06 Insecure Design · A07 Authentication Failures ·
A08 Software/Data Integrity · A09 Logging/Alerting Failures · A10 SSRF/Mishandling
Exceptional Conditions — **all covered.**

**2021:** A01–A10 — **all covered.**

**2017 (distinct ones):** A1 Injection · A2 Broken Auth · A3 Sensitive Data
Exposure · A4 XXE · A5 Broken Access Control · A6 Security Misconfig · A7 XSS ·
A8 Insecure Deserialization — **all covered.**

## Suggested injection order (each = its own chapter)
1. SQL Injection (full spectrum) — the best teacher, named first
2. XSS (all types)
3. Command Injection
4. Path Traversal / LFI→RCE
5. SSRF
6. XXE
7. SSTI
8. Access Control / IDOR
9. Auth / JWT / OAuth
10. NoSQL, GraphQL, WebSocket, business logic, race conditions
11. File upload, deserialization, prototype pollution, LLM
12. CSRF, CORS, clickjacking, info disclosure, host header
13. Request smuggling + cache attacks (last — most infra-dependent)

## Workflow reminder
- Inject locally (fast) → push to GitHub → pull to VPS → exploit + capture report evidence on the real domain.
- Keep a private `/solutions/<class>/<variant>.md` per variant (NOT served by the app).
- VPS must be **IP-allowlisted** (you + manager only) before injecting dangerous classes (RCE/SQLi/command-injection).
