/**
 * Product + print-area configuration.
 *
 * This is the single source of truth a production integration would need to
 * customise per product / per variant. See README.md ("Print area config").
 *
 * All geometry is expressed in the viewer's *logical* coordinate space
 * (a square of `canvasSize` units). The viewer scales this space responsively
 * to whatever pixel size the container is, so these numbers never change with
 * screen size.
 */

export type VariantId = "black" | "navy" | "orange";

export interface Variant {
  id: VariantId;
  name: string;
  /** Hex colour used for the swatch dot in the UI. */
  swatch: string;
  /** Bag body / handle / outline colours used to draw the SVG mockup. */
  mockup: {
    body: string;
    handle: string;
    outline: string;
    /** stitch/detail line colour */
    stitch: string;
  };
  /**
   * Optional path to a real product photo (served from /public), e.g.
   * "/bags/tote-black.png". When present the viewer uses the photo as the bag
   * background and falls back to the drawn SVG mockup if the file is missing.
   */
  image?: string;
  /**
   * Optional per-variant print area (logical units). Real photos put the bag
   * front panel in a different place/size than the SVG, so a variant backed by
   * a photo usually needs its own print area. Falls back to product.printArea.
   */
  printArea?: PrintArea;
}

/** A rectangular printable zone, in logical canvas units. */
export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProductConfig {
  id: string;
  title: string;
  /** Price in major currency units (e.g. pounds). */
  price: number;
  currency: string;
  locale: string;
  /** Logical size of the (square) viewer coordinate space. */
  canvasSize: number;
  /**
   * The printable zone on the bag front, in logical units.
   * Change this to move / resize where a design can be placed.
   * In production this would typically vary per product and per variant.
   */
  printArea: PrintArea;
  variants: Variant[];
}

/**
 * Print area tuned to the product PHOTOS (public/bags/tote-*.png). All three
 * photos share the same framing, so they share one print area. It's an estimate
 * — calibrate by hovering the viewer to reveal the dashed outline and nudging
 * these four numbers until the box sits on the bag's front panel.
 */
const PHOTO_PRINT_AREA: PrintArea = { x: 190, y: 292, width: 220, height: 202 };

export const TOTE_PRODUCT: ProductConfig = {
  id: "canvas-tote-bag",
  title: "Canvas Tote Bag",
  price: 24,
  currency: "GBP",
  locale: "en-GB",
  canvasSize: 600,
  // SVG-fallback print area (used only if a variant photo is missing). Aligned
  // to the drawn bag in lib/bag-mockup.ts.
  printArea: { x: 165, y: 212, width: 270, height: 300 },
  variants: [
    {
      id: "black",
      name: "Black",
      swatch: "#232323",
      mockup: {
        body: "#2c2c2e",
        handle: "#202022",
        outline: "#101012",
        stitch: "#4a4a4d",
      },
      image: "/bags/tote-black.png",
      printArea: PHOTO_PRINT_AREA,
    },
    {
      id: "navy",
      name: "Navy",
      swatch: "#2a3450",
      mockup: {
        body: "#2b3552",
        handle: "#212a41",
        outline: "#161d2f",
        stitch: "#45527a",
      },
      image: "/bags/tote-navy.png",
      printArea: PHOTO_PRINT_AREA,
    },
    {
      id: "orange",
      name: "Orange",
      swatch: "#e2601f",
      mockup: {
        body: "#e8712a",
        handle: "#c95c18",
        outline: "#a94a11",
        stitch: "#f2a674",
      },
      image: "/bags/tote-orange.png",
      printArea: PHOTO_PRINT_AREA,
    },
  ],
};

export function getVariant(product: ProductConfig, id: VariantId): Variant {
  return product.variants.find((v) => v.id === id) ?? product.variants[0];
}

/** The print area for a variant, falling back to the product default. */
export function getPrintArea(product: ProductConfig, variant: Variant): PrintArea {
  return variant.printArea ?? product.printArea;
}

export function formatPrice(
  amount: number,
  product: Pick<ProductConfig, "currency" | "locale">,
): string {
  return new Intl.NumberFormat(product.locale, {
    style: "currency",
    currency: product.currency,
  }).format(amount);
}
