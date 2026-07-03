import type { DesignTransform } from "./cart-store";

/** What the viewer hands back when "Add to basket" is pressed. */
export interface BasketPayload {
  /** Composite PNG (bag + artwork) as a data URL. */
  thumbnail: string;
  /** Placement of the artwork relative to the print area, or null for a plain bag. */
  transform: DesignTransform | null;
  /** Provenance of the uploaded file. */
  source: { fileName: string; fileType: string } | null;
  /** Size (logical units) of the print area the transform is relative to. */
  printArea: { width: number; height: number };
}

/** Imperative handle the ProductPage uses to drive the (client-only) viewer. */
export interface CanvasViewerApi {
  uploadDesign: (file: File) => Promise<void>;
  deleteDesign: () => void;
  hasDesign: () => boolean;
  buildPayload: () => BasketPayload | null;
}
