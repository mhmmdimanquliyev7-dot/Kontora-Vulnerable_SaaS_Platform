"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// apiFetch dispatches this once a 401 survives a refresh attempt — i.e. the
// user is genuinely logged out, not just mid-token-rotation. Centralizing
// the redirect here (rather than in every query hook) means it fires
// exactly once no matter how many in-flight requests failed at the same time.
export function SessionExpiredListener() {
  const router = useRouter();

  useEffect(() => {
    function handleExpired() {
      if (!window.location.pathname.startsWith("/login")) {
        router.replace(`/login?reason=expired`);
      }
    }
    window.addEventListener("kontora:session-expired", handleExpired);
    return () => window.removeEventListener("kontora:session-expired", handleExpired);
  }, [router]);

  return null;
}
