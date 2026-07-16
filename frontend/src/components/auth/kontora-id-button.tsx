"use client";

import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api/client";

// Starts the OAuth authorization-code flow. This is deliberately a plain link
// (a full navigation), not a fetch: the flow is a chain of browser redirects
// through the identity provider and back to the API's callback, which is what
// sets the session cookies. An XHR could not follow that chain.
//
// The returnUrl handed over here has already been sanitized by the login page,
// and the API sanitizes it again on the way in and on the way out — the browser
// is not trusted with it at any point.
export function KontoraIdButton({ returnUrl }: { returnUrl?: string | null }) {
  const href = returnUrl
    ? apiUrl(`/api/auth/oauth/start?returnUrl=${encodeURIComponent(returnUrl)}`)
    : apiUrl("/api/auth/oauth/start");

  return (
    <Button variant="outline" className="w-full" asChild>
      <a href={href}>
        <span
          aria-hidden="true"
          className="flex size-4 items-center justify-center rounded bg-gradient-to-br from-primary to-violet-600 text-[9px] font-bold text-primary-foreground"
        >
          K
        </span>
        Sign in with Kontora ID
      </a>
    </Button>
  );
}
