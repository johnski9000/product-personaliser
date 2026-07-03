# TOTE&CO — Custom Tote Viewer (PoC)

A proof‑of‑concept e‑commerce product page where a shopper uploads their own
artwork, positions it on a tote bag with **Fabric.js**, previews it live in 2D,
and adds the customised product to a cart drawer with a composite preview.

Everything is **client‑side only** — no backend, no Shopify integration. The
"line item" JSON that production would send to Shopify is built and logged to the
console on _Add to basket_.

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript) + **React 19**
- **Tailwind CSS v4**
- **shadcn/ui** (Base UI `base-nova` preset) for all UI primitives
- **Fabric.js v6** (promise API, ESM, loaded client‑side only)
- **Zustand** for cart state (in‑memory, no persistence)

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Then: **upload a logo** (PNG/JPG/SVG) → drag / scale (corner handles) / rotate
(top handle) it on the bag → optionally **resize the print area** by dragging the
dashed box's handles → **switch colours** (Black / Navy / Orange) → **Add to
basket** → see it in the cart drawer with the composite thumbnail and subtotal.
The design JSON is also logged to the console.

```bash
npm run build   # production build (Turbopack)
npm start       # serve the production build
```

> Next.js 16 notes: Turbopack is the default for `dev` and `build` (no
> `--turbopack` flag), and `next lint` was removed — lint with `npx eslint .`.

## How the viewer works

| Concern | Where |
| --- | --- |
| Product + **print area** config | [`lib/products.ts`](lib/products.ts) |
| Bag photos (per variant) | [`public/bags/`](public/bags/) |
| SVG mockup fallback | [`lib/bag-mockup.ts`](lib/bag-mockup.ts) |
| Fabric canvas (upload, clip, constrain, resize, export) | [`components/canvas-viewer.tsx`](components/canvas-viewer.tsx) |
| Cart state + line‑item types | [`lib/cart-store.ts`](lib/cart-store.ts) |

Key behaviours:

- **One design at a time.** A new upload replaces the previous one.
- **Clipped to the print area** via a Fabric `clipPath` (`absolutePositioned`), so
  artwork can never render outside the printable zone.
- **Drag‑constrained** — the design's centre is clamped to the print area on
  `object:moving`, so it can't be dragged fully out.
- **Resizable print area** — the dashed box is itself an interactive object; the
  shopper selects it and drags its handles to resize the printable zone. The
  design's clip, drag‑limit and the exported print‑area size all follow it live.
- **Delete** with the _Remove_ button, or select the design and press
  `Delete`/`Backspace`.
- **Variant switch** swaps only the bag background; the design (and any manual
  print‑area resize) stays put.
- **Bag background per variant** — each variant loads a real photo from
  `public/bags/` (`FabricImage.fromURL`), and falls back to the drawn SVG mockup
  if the file is missing. The print area follows whichever loaded.
- **Clean export** — bag photos are same‑origin (`/public`) and uploads use
  `URL.createObjectURL`, so the canvas is never tainted and `toDataURL` produces
  a valid composite PNG.
- **Client‑only Fabric** — the viewer is loaded with
  `next/dynamic(… , { ssr:false })` _and_ imports Fabric via `await import()`
  inside an effect, so nothing touches `window`/`document` during SSR. The Fabric
  canvas is disposed (`canvas.dispose()`, async in v6) on unmount.
- **Responsive** — the canvas uses a fixed logical space (`canvasSize`, 600²) and
  a `ResizeObserver` scales the view (`setZoom`/`setDimensions`) down to mobile
  widths. All print‑area maths stay in logical units.

## Print area configuration (per product / variant)

The printable zone is defined in [`lib/products.ts`](lib/products.ts). Because
the three colours are photos with the same framing, they share one print area:

```ts
// Tuned to the product photos in public/bags/*.png
const PHOTO_PRINT_AREA = { x: 190, y: 292, width: 220, height: 202 };

export const TOTE_PRODUCT: ProductConfig = {
  canvasSize: 600,                                   // logical square the viewer works in
  printArea: { x: 165, y: 212, width: 270, height: 300 }, // SVG-fallback zone
  variants: [
    { id: "black",  /* ... */ image: "/bags/tote-black.png",  printArea: PHOTO_PRINT_AREA },
    { id: "navy",   /* ... */ image: "/bags/tote-navy.png",   printArea: PHOTO_PRINT_AREA },
    { id: "orange", /* ... */ image: "/bags/tote-orange.png", printArea: PHOTO_PRINT_AREA },
  ],
};
```

- All geometry is in **logical units** (a `canvasSize`×`canvasSize` square). The
  viewer scales this responsively, so these numbers never change with screen size.
- A variant's `printArea` is used when its **photo** loads; if the photo is
  missing it falls back to the SVG mockup and the product‑level `printArea`
  (aligned to the drawn bag in [`lib/bag-mockup.ts`](lib/bag-mockup.ts)).
- **Per‑variant zones**: give any variant a different `printArea` and it'll use
  it — nothing else to wire up.
- **Calibrating**: the easiest way to set these numbers is to run the app and
  drag the dashed print‑area box onto the bag front — the shopper resize control
  doubles as a visual ruler.

Swapping the photos: drop `tote-black.png` / `tote-navy.png` / `tote-orange.png`
into [`public/bags/`](public/bags/). See [`public/bags/README.md`](public/bags/README.md).

## The "Shopify line item" payload

On _Add to basket_ the viewer exports two things (see
[`components/product-page.tsx`](components/product-page.tsx)):

1. A **composite PNG** data URL (bag + artwork) — used for the cart thumbnail.
2. A **design transform**, expressed **relative to the print area** so it is
   resolution‑independent:

```jsonc
{
  "variant": "black",
  "variantName": "Black",
  "printArea": { "width": 220, "height": 202 },   // the (possibly shopper-resized) zone
  "transform": {
    "centerXNorm": 0.5,      // artwork centre within the print area, 0..1
    "centerYNorm": 0.5,
    "scaleX": 1.72,          // scale relative to the artwork's natural size
    "scaleY": 1.72,
    "angle": 0,              // degrees, clockwise
    "widthPx": 167,          // footprint in logical print‑area units
    "heightPx": 167,
    "naturalWidth": 1,       // intrinsic size of the uploaded file
    "naturalHeight": 1
  },
  "source": { "fileName": "logo.png", "fileType": "image/png" }
}
```

In production this object would be attached to the Shopify line item (as line
item properties / a cart attribute). A server‑side renderer replays the
normalised `transform` against the **real** print dimensions (e.g. mm at 300 dpi)
to produce print‑ready artwork — the same reason the transform is stored relative
to the print area rather than in pixels.

## Project structure

```
app/
  layout.tsx          # Navbar + main + Footer + CartDrawer, fonts, metadata
  page.tsx            # renders <ProductPage/>
components/
  navbar.tsx          # sticky nav, cart badge, mobile menu (Sheet)
  footer.tsx          # dummy columns + newsletter + payment placeholders
  product-page.tsx    # viewer + variant swatches + upload + add to basket
  canvas-viewer.tsx   # Fabric.js v6 canvas (client‑only)
  cart-drawer.tsx     # Sheet: line items, stepper, subtotal, empty state
  ui/                 # shadcn/ui components
lib/
  products.ts         # product + PRINT AREA config (edit here)
  bag-mockup.ts       # SVG tote fallback per colour
  cart-store.ts       # Zustand cart + line‑item types
  viewer-types.ts     # imperative viewer API types (no Fabric import)
public/
  bags/               # per-variant product photos (tote-black/navy/orange.png)
```

## PoC scope / not included

- No backend, persistence, checkout, or Shopify calls (all dummy links use `#`).
- Bags are real photos from `public/bags/`, with a drawn SVG mockup as fallback.
- Single design per bag; no multi‑layer / text tools.
- SVG uploads are placed as vector groups; raster uploads are placed as images.
