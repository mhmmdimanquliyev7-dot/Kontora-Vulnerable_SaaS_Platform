import { NextResponse, type NextRequest } from "next/server";

// Prefix-matched (a sub-path like /reset-password?token=... still matches).
// Not the marketing site's home page — that's "/" exactly, handled
// separately below, since a plain startsWith("/") would match every path.
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/features",
  "/pricing",
  "/about",
  "/blog",
];

function isPublicPath(pathname: string): boolean {
  return pathname === "/" || PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

// Cookies are set by the API with no explicit Domain, so they're host-only
// for "localhost" — which the browser sends to the Next.js server too (same
// hostname as the API, just a different port; cookie scoping ignores port).
// That lets this proxy do a cheap, fast redirect on the common case (never
// logged in / explicitly logged out) without a network round-trip. It only
// checks *presence*, not validity (the "thin proxy" pattern — optimistic
// checks here, authoritative ones in the app) — an expired-but-present
// access token still passes through here, and is caught by the apiFetch
// refresh-retry flow (or the session-expired redirect) once an actual API
// call 401s.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has("kontora_at") || request.cookies.has("kontora_rt");
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    // Where to send them once they've signed in. Only the path+query is
    // carried, never an absolute URL, and the login page re-validates it with
    // sanitizeReturnPath before acting on it — this value reaches the login
    // page through the address bar, so it is untrusted by the time it's read
    // back even though we wrote it ourselves.
    const returnUrl = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("returnUrl", returnUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
