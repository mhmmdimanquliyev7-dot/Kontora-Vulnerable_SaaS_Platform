import Link from "next/link";

import { Logo } from "@/components/shared/logo";

const FOOTER_LINKS = {
  Product: [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
  ],
  Company: [{ href: "/about", label: "About" }],
  Account: [
    { href: "/login", label: "Log in" },
    { href: "/register", label: "Sign up" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Invoicing and client management built for small teams — send invoices, track
            payments, and know where you stand.
          </p>
        </div>

        {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
          <div key={heading}>
            <h3 className="text-sm font-semibold">{heading}</h3>
            <ul className="mt-3 space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Kontora. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
