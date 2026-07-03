"use client";

import { create } from "zustand";
import type { VariantId } from "./products";

/**
 * The design's placement, expressed *relative to the print area* so it is
 * resolution-independent. In production this object is what you would attach
 * to the Shopify line item (as line item properties / a custom attribute) and
 * replay server-side to render the print-ready artwork.
 */
export interface DesignTransform {
  /** Centre of the design within the print area, normalised 0..1. */
  centerXNorm: number;
  centerYNorm: number;
  /** Scale relative to the artwork's natural size. */
  scaleX: number;
  scaleY: number;
  /** Rotation in degrees, clockwise. */
  angle: number;
  /** Footprint in logical print-area units, for quick reference. */
  widthPx: number;
  heightPx: number;
  /** Natural (intrinsic) size of the uploaded artwork. */
  naturalWidth: number;
  naturalHeight: number;
}

export interface LineItemDesign {
  variant: VariantId;
  variantName: string;
  /** Print area size in logical units (the coordinate system for the transform). */
  printArea: { width: number; height: number };
  /** null when a plain bag (no artwork) is added. */
  transform: DesignTransform | null;
  /** Basic provenance of the uploaded file. */
  source: { fileName: string; fileType: string } | null;
}

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  variant: VariantId;
  variantName: string;
  unitPrice: number;
  quantity: number;
  /** Composite PNG data URL (bag + artwork) for the thumbnail. */
  thumbnail: string;
  design: LineItemDesign;
}

export type NewCartItem = Omit<CartItem, "id" | "quantity"> & {
  quantity?: number;
};

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: NewCartItem) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
}

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback (older browsers); randomness is fine for client-only ids.
  return `id-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  isOpen: false,
  addItem: (item) =>
    set((state) => ({
      items: [
        ...state.items,
        { ...item, id: createId(), quantity: item.quantity ?? 1 },
      ],
    })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  setQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items
        .map((i) =>
          i.id === id ? { ...i, quantity: Math.max(0, Math.round(quantity)) } : i,
        )
        // Removing at 0 keeps the stepper's minus button behaving intuitively.
        .filter((i) => i.quantity > 0),
    })),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  setOpen: (open) => set({ isOpen: open }),
}));

/** Selector helpers (kept as stable module functions to avoid re-renders). */
export const selectItemCount = (s: CartState) =>
  s.items.reduce((n, i) => n + i.quantity, 0);

export const selectSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
