"use client";

/**
 * Client-only Fabric.js v6 viewer.
 *
 * Fabric touches window/document and its package marks the browser build as
 * `"node": null`, so this component is loaded via `next/dynamic({ ssr:false })`
 * (see product-page.tsx) AND imports the library lazily with `await import`.
 * `import type` below is erased at build time and never pulls Fabric server-side.
 *
 * Interaction model:
 *  - The uploaded design is draggable / scalable (corners) / rotatable (top).
 *  - The dashed print-area box is itself an interactive object: the shopper can
 *    select it and drag its handles to RESIZE the printable zone. The design's
 *    clip, drag-constraint and the exported line-item JSON all follow the box.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Canvas as FabricCanvas,
  FabricObject,
  Rect as FabricRect,
} from "fabric";
import type {
  ProductConfig,
  Variant,
  VariantId,
  PrintArea,
} from "@/lib/products";
import type { DesignTransform } from "@/lib/cart-store";
import type { BasketPayload, CanvasViewerApi } from "@/lib/viewer-types";
import { toteDataUrl } from "@/lib/bag-mockup";

type FabricModule = typeof import("fabric");

/** Smallest allowed side of the print area, in logical units. */
const MIN_PRINT = 60;

interface CanvasViewerProps {
  product: ProductConfig;
  variant: Variant;
  onReady?: (api: CanvasViewerApi) => void;
  onDesignChange?: (hasDesign: boolean) => void;
}

export default function CanvasViewer({
  product,
  variant,
  onReady,
  onDesignChange,
}: CanvasViewerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  const fabricRef = useRef<FabricModule | null>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const boxRef = useRef<FabricRect | null>(null); // interactive print-area box
  const designRef = useRef<FabricObject | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const sourceRef = useRef<BasketPayload["source"]>(null);

  const appliedVariantRef = useRef<VariantId | null>(null);
  const printAreaRef = useRef<PrintArea>(product.printArea); // current effective area
  const baseAreaRef = useRef<PrintArea | null>(null); // last variant-provided base

  // Keep parent callbacks + latest variant current so imperative methods stay
  // stable. Synced in an effect (never written during render).
  const onReadyRef = useRef(onReady);
  const onDesignChangeRef = useRef(onDesignChange);
  const variantRef = useRef(variant);
  useEffect(() => {
    onReadyRef.current = onReady;
    onDesignChangeRef.current = onDesignChange;
    variantRef.current = variant;
  });

  const [ready, setReady] = useState(false);

  // --- small helpers ------------------------------------------------------
  const clipFor = useCallback((area: PrintArea): FabricRect => {
    const fabric = fabricRef.current!;
    return new fabric.Rect({
      left: area.x,
      top: area.y,
      width: area.width,
      height: area.height,
      absolutePositioned: true,
    });
  }, []);

  const clampDesign = useCallback((obj: FabricObject) => {
    const fabric = fabricRef.current;
    if (!fabric) return;
    const pa = printAreaRef.current;
    const c = obj.getCenterPoint();
    const x = Math.min(Math.max(c.x, pa.x), pa.x + pa.width);
    const y = Math.min(Math.max(c.y, pa.y), pa.y + pa.height);
    if (x !== c.x || y !== c.y) {
      obj.setPositionByOrigin(new fabric.Point(x, y), "center", "center");
      obj.setCoords();
    }
  }, []);

  const readBoxArea = useCallback((): PrintArea => {
    const box = boxRef.current!;
    return {
      x: box.left ?? 0,
      y: box.top ?? 0,
      width: (box.width ?? 0) * (box.scaleX ?? 1),
      height: (box.height ?? 0) * (box.scaleY ?? 1),
    };
  }, []);

  // Keep the box on-canvas and above the minimum size while it's transformed.
  const constrainBox = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const BASE = product.canvasSize;
    let w = (box.width ?? 0) * (box.scaleX ?? 1);
    let h = (box.height ?? 0) * (box.scaleY ?? 1);
    if (w < MIN_PRINT) {
      box.scaleX = MIN_PRINT / (box.width ?? 1);
      w = MIN_PRINT;
    }
    if (h < MIN_PRINT) {
      box.scaleY = MIN_PRINT / (box.height ?? 1);
      h = MIN_PRINT;
    }
    if ((box.left ?? 0) < 0) box.left = 0;
    if ((box.top ?? 0) < 0) box.top = 0;
    if ((box.left ?? 0) + w > BASE) {
      box.left = Math.max(0, BASE - w);
      if ((box.left ?? 0) + w > BASE)
        box.scaleX = (BASE - (box.left ?? 0)) / (box.width ?? 1);
    }
    if ((box.top ?? 0) + h > BASE) {
      box.top = Math.max(0, BASE - h);
      if ((box.top ?? 0) + h > BASE)
        box.scaleY = (BASE - (box.top ?? 0)) / (box.height ?? 1);
    }
    box.setCoords();
  }, [product.canvasSize]);

  // Push the box's current geometry into the print area + design clip (live,
  // while the shopper drags a handle). The design is not repositioned here — it
  // stays put and is simply re-clipped by the new box.
  const syncFromBox = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const area = readBoxArea();
    printAreaRef.current = area;
    const design = designRef.current;
    if (design) design.clipPath = clipFor(area);
    canvas.requestRenderAll();
  }, [readBoxArea, clipFor]);

  // Bake scale into width/height so subsequent maths stay simple.
  const bakeBox = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    box.set({
      width: (box.width ?? 0) * (box.scaleX ?? 1),
      height: (box.height ?? 0) * (box.scaleY ?? 1),
      scaleX: 1,
      scaleY: 1,
    });
    box.setCoords();
  }, []);

  // Programmatically move/resize the print area (variant change / init). When
  // `remap` is set, the design is re-anchored proportionally into the new zone.
  const setPrintArea = useCallback(
    (area: PrintArea, remap: boolean) => {
      const canvas = canvasRef.current;
      const box = boxRef.current;
      if (!canvas || !box) return;
      const prev = printAreaRef.current;
      const design = designRef.current;
      if (design && remap) {
        const fabric = fabricRef.current!;
        const c = design.getCenterPoint();
        const xN = (c.x - prev.x) / prev.width;
        const yN = (c.y - prev.y) / prev.height;
        design.setPositionByOrigin(
          new fabric.Point(area.x + xN * area.width, area.y + yN * area.height),
          "center",
          "center",
        );
      }
      box.set({
        left: area.x,
        top: area.y,
        width: area.width,
        height: area.height,
        scaleX: 1,
        scaleY: 1,
      });
      box.setCoords();
      if (design) {
        design.clipPath = clipFor(area);
        design.setCoords();
      }
      printAreaRef.current = area;
      canvas.requestRenderAll();
    },
    [clipFor],
  );

  // --- background: real photo (if provided) or drawn SVG fallback ---------
  const loadBackground = useCallback(
    async (v: Variant): Promise<boolean> => {
      const fabric = fabricRef.current;
      const canvas = canvasRef.current;
      if (!fabric || !canvas) return false;
      const BASE = product.canvasSize;

      let img: Awaited<ReturnType<typeof fabric.FabricImage.fromURL>> | null =
        null;
      let usedPhoto = false;
      if (v.image) {
        try {
          img = await fabric.FabricImage.fromURL(v.image);
          usedPhoto = true;
        } catch {
          img = null; // file not added yet -> fall back to SVG
        }
      }
      if (!img) {
        img = await fabric.FabricImage.fromURL(toteDataUrl(v, BASE));
        usedPhoto = false;
      }
      if (canvasRef.current !== canvas) return usedPhoto; // disposed mid-load

      const natW = img.width || BASE;
      const natH = img.height || BASE;
      const scale = Math.min(BASE / natW, BASE / natH); // contain, centred
      img.set({
        originX: "center",
        originY: "center",
        left: BASE / 2,
        top: BASE / 2,
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
      });
      canvas.backgroundImage = img;
      canvas.requestRenderAll();
      return usedPhoto;
    },
    [product.canvasSize],
  );

  // Apply a variant: swap the bag, then reset the print area to the variant's
  // base only when that base actually changes (so a shopper's manual resize is
  // preserved across colour switches, since all photos share one base area).
  const applyVariant = useCallback(
    async (v: Variant) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (appliedVariantRef.current === v.id) return;
      appliedVariantRef.current = v.id;

      const usedPhoto = await loadBackground(v);
      if (canvasRef.current !== canvas) return;
      if (appliedVariantRef.current !== v.id) return;

      const base = usedPhoto && v.printArea ? v.printArea : product.printArea;
      const cur = baseAreaRef.current;
      const differs =
        !cur ||
        cur.x !== base.x ||
        cur.y !== base.y ||
        cur.width !== base.width ||
        cur.height !== base.height;
      if (differs) {
        setPrintArea(base, true);
        baseAreaRef.current = base;
      }
    },
    [loadBackground, product.printArea, setPrintArea],
  );

  // --- place / replace the single design ---------------------------------
  const placeDesign = useCallback(
    (obj: FabricObject, source: BasketPayload["source"]) => {
      const fabric = fabricRef.current;
      const canvas = canvasRef.current;
      if (!fabric || !canvas) return;

      if (designRef.current) {
        canvas.remove(designRef.current);
        designRef.current = null;
      }

      const pa = printAreaRef.current;
      const natW = obj.width || 1;
      const natH = obj.height || 1;
      const fit = Math.min((pa.width * 0.62) / natW, (pa.height * 0.62) / natH);

      obj.set({
        originX: "center",
        originY: "center",
        left: pa.x + pa.width / 2,
        top: pa.y + pa.height / 2,
        scaleX: fit,
        scaleY: fit,
        angle: 0,
        objectCaching: false, // so the live-updated clip re-renders cleanly
        borderColor: "#111827",
        cornerColor: "#ffffff",
        cornerStrokeColor: "#111827",
        cornerStyle: "circle",
        cornerSize: 12,
        transparentCorners: false,
        padding: 4,
        strokeUniform: true,
      });
      obj.clipPath = clipFor(pa);
      // Corner (uniform) scaling + rotate only; hide the side stretch handles.
      obj.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
      obj.setCoords();

      canvas.add(obj); // added after the box -> design stays on top, box behind
      canvas.setActiveObject(obj);
      designRef.current = obj;
      sourceRef.current = source;
      canvas.requestRenderAll();
      onDesignChangeRef.current?.(true);
    },
    [clipFor],
  );

  const uploadDesign = useCallback(
    async (file: File) => {
      const fabric = fabricRef.current;
      const canvas = canvasRef.current;
      if (!fabric || !canvas) return;

      const isSvg =
        file.type === "image/svg+xml" ||
        file.name.toLowerCase().endsWith(".svg");
      const source = {
        fileName: file.name,
        fileType: file.type || (isSvg ? "image/svg+xml" : ""),
      };

      if (isSvg) {
        const text = await file.text();
        if (canvasRef.current !== canvas) return;
        const { objects, options } = await fabric.loadSVGFromString(text);
        if (canvasRef.current !== canvas) return;
        const valid = objects.filter((o): o is FabricObject => o != null);
        if (valid.length === 0) return;
        const obj =
          valid.length === 1
            ? valid[0]
            : fabric.util.groupSVGElements(valid, options);
        placeDesign(obj, source);
      } else {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        const img = await fabric.FabricImage.fromURL(url);
        if (canvasRef.current !== canvas) {
          URL.revokeObjectURL(url);
          if (objectUrlRef.current === url) objectUrlRef.current = null;
          return;
        }
        placeDesign(img, source);
      }
    },
    [placeDesign],
  );

  const deleteDesign = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !designRef.current) return;
    canvas.remove(designRef.current);
    designRef.current = null;
    sourceRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    onDesignChangeRef.current?.(false);
  }, []);

  const buildPayload = useCallback((): BasketPayload | null => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas) return null;

    const pa = printAreaRef.current;
    const BASE = product.canvasSize;

    const prevZoom = canvas.getZoom();
    const prevW = canvas.getWidth();
    const prevH = canvas.getHeight();
    const prevActive = canvas.getActiveObject();

    // Normalise to full logical resolution; hide the (UI-only) print box.
    canvas.discardActiveObject();
    if (box) box.visible = false;
    canvas.setDimensions({ width: BASE, height: BASE });
    canvas.setZoom(1);
    canvas.renderAll();

    const thumbnail = canvas.toDataURL({ format: "png", multiplier: 2 });

    // Restore interactive view synchronously (no interim paint).
    canvas.setDimensions({ width: prevW, height: prevH });
    canvas.setZoom(prevZoom);
    if (box) box.visible = true;
    if (prevActive) canvas.setActiveObject(prevActive);
    canvas.requestRenderAll();

    let transform: DesignTransform | null = null;
    const design = designRef.current;
    if (design) {
      const c = design.getCenterPoint();
      transform = {
        centerXNorm: (c.x - pa.x) / pa.width,
        centerYNorm: (c.y - pa.y) / pa.height,
        scaleX: design.scaleX ?? 1,
        scaleY: design.scaleY ?? 1,
        angle: design.angle ?? 0,
        widthPx: design.getScaledWidth(),
        heightPx: design.getScaledHeight(),
        naturalWidth: design.width ?? 0,
        naturalHeight: design.height ?? 0,
      };
    }
    return {
      thumbnail,
      transform,
      source: sourceRef.current,
      printArea: { width: pa.width, height: pa.height },
    };
  }, [product.canvasSize]);

  const hasDesign = useCallback(() => designRef.current != null, []);

  // --- init / teardown ----------------------------------------------------
  useEffect(() => {
    let disposed = false;
    const el = canvasElRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    let resizeObserver: ResizeObserver | null = null;

    const setup = async () => {
      const fabric = await import("fabric");
      if (disposed || canvasRef.current) return;
      fabricRef.current = fabric;

      const BASE = product.canvasSize;
      const canvas = new fabric.Canvas(el, {
        width: BASE,
        height: BASE,
        preserveObjectStacking: true,
        selection: false,
        uniformScaling: true,
        controlsAboveOverlay: true,
        targetFindTolerance: 8, // easier to grab the thin print-box border
        backgroundColor: "transparent",
      });
      canvasRef.current = canvas;

      // Interactive print-area box. It sits BELOW the design (which is clipped
      // to it, so the design never covers the border) and is hittable over its
      // whole area — the shopper clicks any empty part of it to select & resize.
      const pa = printAreaRef.current;
      const box = new fabric.Rect({
        left: pa.x,
        top: pa.y,
        width: pa.width,
        height: pa.height,
        fill: "transparent",
        stroke: "#ffffff",
        strokeWidth: 2,
        strokeDashArray: [8, 6],
        strokeUniform: true,
        objectCaching: false,
        selectable: true,
        evented: true,
        lockRotation: true,
        cornerColor: "#ffffff",
        cornerStrokeColor: "#111827",
        cornerStyle: "circle",
        cornerSize: 11,
        transparentCorners: false,
        borderColor: "#ffffff",
        borderScaleFactor: 1.5,
      });
      box.setControlsVisibility({ mtr: false }); // no rotation for the print area
      box.shadow = new fabric.Shadow({
        color: "rgba(0,0,0,0.45)",
        blur: 3,
      });
      boxRef.current = box;
      canvas.add(box);

      // Transform routing: box resizes the print area; design is constrained.
      canvas.on("object:moving", (e) => {
        if (e.target === boxRef.current) {
          constrainBox();
          syncFromBox();
        } else if (e.target) {
          clampDesign(e.target);
        }
      });
      canvas.on("object:scaling", (e) => {
        if (e.target === boxRef.current) {
          constrainBox();
          syncFromBox();
        }
      });
      canvas.on("object:modified", (e) => {
        if (e.target === boxRef.current) {
          bakeBox();
          syncFromBox();
        }
      });

      // Responsive: keep BASE logical space, scale the view to the container.
      const resize = () => {
        const c = canvasRef.current;
        const w = wrapperRef.current;
        if (!c || !w) return;
        const size = Math.max(1, Math.min(w.clientWidth, BASE));
        c.setDimensions({ width: size, height: size });
        c.setZoom(size / BASE);
        c.requestRenderAll();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(wrapper);
      resize();

      await applyVariant(variantRef.current);

      if (disposed) return;
      setReady(true);
      onReadyRef.current?.({
        uploadDesign,
        deleteDesign,
        hasDesign,
        buildPayload,
      });
    };

    void setup();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      const canvas = canvasRef.current;
      canvasRef.current = null;
      boxRef.current = null;
      designRef.current = null;
      appliedVariantRef.current = null;
      baseAreaRef.current = null;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      void canvas?.dispose();
    };
    // Mount-once. All handlers read refs / stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap the bag when the variant changes.
  useEffect(() => {
    if (!ready) return;
    void applyVariant(variant);
  }, [variant, ready, applyVariant]);

  // Keyboard delete: only when the design (not the print box) is active.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const ae = document.activeElement as HTMLElement | null;
      const tag = ae?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || ae?.isContentEditable) return;
      const canvas = canvasRef.current;
      if (!canvas || !designRef.current) return;
      if (canvas.getActiveObject() !== designRef.current) return;
      e.preventDefault();
      deleteDesign();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteDesign]);

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto aspect-square w-full max-w-[600px] touch-none overflow-hidden rounded-xl border bg-linear-to-b from-muted/40 to-muted/10"
    >
      <canvas ref={canvasElRef} />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          Loading viewer…
        </div>
      )}
    </div>
  );
}
