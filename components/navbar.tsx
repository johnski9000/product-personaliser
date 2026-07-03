"use client";

import { useState } from "react";
import { Menu, Search, ShoppingBag, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCartStore, selectItemCount } from "@/lib/cart-store";

const NAV_LINKS = ["Shop", "Collections", "About", "Contact"];

export function Navbar() {
  const count = useCartStore(selectItemCount);
  const openCart = useCartStore((s) => s.openCart);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4">
        {/* Mobile menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu />
        </Button>

        {/* Logo */}
        <a
          href="#"
          className="font-heading text-lg font-bold tracking-tight whitespace-nowrap"
        >
          TOTE&amp;CO
        </a>

        {/* Desktop nav */}
        <nav className="ml-6 hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account"
            className="hidden sm:inline-flex"
          >
            <User />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            className="relative"
            onClick={openCart}
          >
            <ShoppingBag />
            {count > 0 && (
              <Badge
                className="absolute -top-1 -right-1 size-4 justify-center rounded-full p-0 text-[10px] tabular-nums"
                aria-hidden
              >
                {count}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle className="font-heading text-lg font-bold">
              TOTE&amp;CO
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href="#"
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {link}
              </a>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
