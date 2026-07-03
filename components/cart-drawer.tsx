"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCartStore,
  selectSubtotal,
  selectItemCount,
} from "@/lib/cart-store";
import { formatPrice, TOTE_PRODUCT } from "@/lib/products";

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore(selectSubtotal);
  const count = useCartStore(selectItemCount);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="text-base">
            Your basket{count > 0 ? ` (${count})` : ""}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Review your custom totes before checkout.
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
              <ShoppingBag className="size-6" />
            </div>
            <p className="text-sm font-medium">Your basket is empty</p>
            <p className="text-sm text-muted-foreground">
              Upload a design, drop it on a tote and add it here.
            </p>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <ul className="flex flex-col gap-4 p-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  {/* Composite preview */}
                  <div className="size-20 shrink-0 overflow-hidden rounded-lg border bg-[repeating-conic-gradient(#f1f1f1_0%_25%,#fff_0%_50%)] bg-[length:16px_16px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnail}
                      alt={`${item.title} preview`}
                      className="size-full object-contain"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.variantName}
                          {item.design.transform ? " · custom print" : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove item"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      {/* Quantity stepper */}
                      <div className="inline-flex items-center rounded-lg border">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            setQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus />
                        </Button>
                        <span className="w-8 text-center text-sm tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Increase quantity"
                          onClick={() =>
                            setQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus />
                        </Button>
                      </div>

                      <span className="text-sm font-medium tabular-nums">
                        {formatPrice(
                          item.unitPrice * item.quantity,
                          TOTE_PRODUCT,
                        )}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        {items.length > 0 && (
          <SheetFooter className="border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-base font-semibold tabular-nums">
                {formatPrice(subtotal, TOTE_PRODUCT)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Shipping &amp; taxes calculated at checkout.
            </p>
            <Button size="lg" className="w-full">
              Checkout
            </Button>
            <Separator className="my-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="w-full"
            >
              Continue shopping
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
