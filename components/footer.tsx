import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COLUMNS: { heading: string; links: string[] }[] = [
  { heading: "Shop", links: ["New Arrivals", "Totes", "Accessories", "Sale"] },
  { heading: "Company", links: ["About", "Careers", "Stores", "Sustainability"] },
  { heading: "Support", links: ["Contact", "Shipping", "Returns", "FAQ"] },
];

const PAYMENTS = ["VISA", "MASTERCARD", "AMEX", "PAYPAL"];

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">{col.heading}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <h3 className="text-sm font-semibold">Newsletter</h3>
            <p className="text-sm text-muted-foreground">
              Get 10% off your first custom tote.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="you@email.com"
                aria-label="Email address"
              />
              <Button type="button" variant="default">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © 2026 TOTE&amp;CO. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {PAYMENTS.map((p) => (
              <span
                key={p}
                className="rounded-md border bg-background px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
