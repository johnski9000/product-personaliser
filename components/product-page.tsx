"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ImagePlus, RefreshCw, Trash2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  TOTE_PRODUCT,
  getVariant,
  formatPrice,
  type VariantId,
} from "@/lib/products";
import { useCartStore, type LineItemDesign } from "@/lib/cart-store";
import type { CanvasViewerApi } from "@/lib/viewer-types";
import { cn } from "@/lib/utils";

// Fabric.js is browser-only: load the viewer client-side, never on the server.
const CanvasViewer = dynamic(() => import("@/components/canvas-viewer"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto grid aspect-square w-full max-w-[600px] place-items-center rounded-xl border bg-muted/30 text-sm text-muted-foreground">
      Loading viewer…
    </div>
  ),
});

const product = TOTE_PRODUCT;

export default function ProductPage() {
  const [variantId, setVariantId] = useState<VariantId>(product.variants[0].id);
  const [hasDesign, setHasDesign] = useState(false);
  const [ready, setReady] = useState(false);

  const apiRef = useRef<CanvasViewerApi | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedVariant = getVariant(product, variantId);

  const handleReady = useCallback((api: CanvasViewerApi) => {
    apiRef.current = api;
    setReady(true);
  }, []);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    // Reset so re-selecting the same file fires change again.
    e.target.value = "";
    if (!file) return;
    await apiRef.current?.uploadDesign(file);
  };

  const handleAddToBasket = () => {
    const payload = apiRef.current?.buildPayload();
    if (!payload) return;

    const variant = getVariant(product, variantId);
    const design: LineItemDesign = {
      variant: variant.id,
      variantName: variant.name,
      // The print area the transform is relative to (may be variant-specific).
      printArea: payload.printArea,
      transform: payload.transform,
      source: payload.source,
    };

    useCartStore.getState().addItem({
      productId: product.id,
      title: product.title,
      variant: variant.id,
      variantName: variant.name,
      unitPrice: product.price,
      thumbnail: payload.thumbnail,
      design,
    });

    // This is the object that would become the Shopify line-item property.
    console.log("[Add to basket] line item design payload:", design);

    useCartStore.getState().openCart();
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Viewer */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <CanvasViewer
            product={product}
            variant={selectedVariant}
            onReady={handleReady}
            onDesignChange={setHasDesign}
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Drag the dashed box to resize the print area · drag your design to
            move, corners to scale, top handle to rotate · Delete to remove
          </p>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit">
              Customisable
            </Badge>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {product.title}
            </h1>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-medium">
                {formatPrice(product.price, product)}
              </span>
              <span className="text-sm text-muted-foreground">
                incl. your custom print
              </span>
            </div>
          </div>

          <Separator />

          {/* Variant swatches */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>Colour</span>
              <span className="text-muted-foreground">
                {selectedVariant.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {product.variants.map((v) => {
                const active = v.id === variantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    aria-pressed={active}
                    aria-label={v.name}
                    title={v.name}
                    className={cn(
                      "relative grid size-9 place-items-center rounded-full ring-1 ring-foreground/15 transition",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                    )}
                    style={{ backgroundColor: v.swatch }}
                  >
                    {active && (
                      <Check className="size-4 text-white drop-shadow" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Upload controls */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Your design</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={hasDesign ? "outline" : "default"}
                size="lg"
                onClick={openFilePicker}
                disabled={!ready}
              >
                {hasDesign ? (
                  <RefreshCw />
                ) : (
                  <ImagePlus />
                )}
                {hasDesign ? "Replace design" : "Upload your design"}
              </Button>
              {hasDesign && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => apiRef.current?.deleteDesign()}
                >
                  <Trash2 />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPG or SVG. Your artwork is clipped to the printable area and
              stays inside it.
            </p>
          </div>

          <Separator />

          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={handleAddToBasket}
            disabled={!ready}
          >
            Add to basket · {formatPrice(product.price, product)}
          </Button>
        </div>
      </div>
    </section>
  );
}
