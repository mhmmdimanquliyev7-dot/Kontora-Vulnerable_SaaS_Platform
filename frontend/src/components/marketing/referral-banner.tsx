// Chapter 15 — XSS lab (INTENTIONAL, training only). Reflected-XSS sink.
//
// The marketing homepage passes the raw `?ref=` query value straight in here and
// it is injected as raw HTML via dangerouslySetInnerHTML — no escaping. A
// payload in the parameter (e.g. ?ref=<img src=x onerror=alert(document.domain)>)
// executes on page load for anyone who opens the link. Rendered as a small,
// unobtrusive personalized referral banner above the hero.

export function ReferralBanner({ value }: { value?: string }) {
  if (!value) return null;

  return (
    <div className="border-b border-primary/15 bg-primary/5">
      <div
        className="mx-auto w-full max-w-6xl px-4 py-2 text-center text-sm text-muted-foreground sm:px-6"
        dangerouslySetInnerHTML={{
          __html: `🎉 Welcome, ${value}! Your referral discount is waiting — start free today.`,
        }}
      />
    </div>
  );
}
