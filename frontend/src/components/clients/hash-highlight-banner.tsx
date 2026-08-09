"use client";

import { useEffect, useState } from "react";

// Chapter 15 — XSS lab (INTENTIONAL, training only). DOM-based XSS sink.
//
// SOURCE: window.location.hash — the URL fragment. The browser NEVER sends the
// fragment to the server (it's stripped from every HTTP request), so this value
// exists only client-side.
// SINK: it is written into the page as raw HTML via dangerouslySetInnerHTML,
// with no sanitization. The whole source -> sink flow happens in the browser,
// with no server round-trip, so this is genuinely DOM-based (not reflected).
//
// Visiting e.g. /clients#<img src=x onerror=alert(document.domain)> executes the
// payload on mount; changing the hash re-runs it via the hashchange listener.
// Framed as a small "jump to section" indicator.
export function HashHighlightBanner() {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    function readHash() {
      const raw = window.location.hash.slice(1);
      if (!raw) {
        setHtml(null);
        return;
      }
      // decode the fragment; fall back to the raw value if it isn't valid
      // percent-encoding (still unsanitized either way).
      let value = raw;
      try {
        value = decodeURIComponent(raw);
      } catch {
        value = raw;
      }
      setHtml(value);
    }

    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  if (!html) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-muted-foreground">
      {/* DOM-based sink: the hash value is injected as raw HTML. */}
      Section: <span dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
