# Bag photos

Drop real product photos here to replace the drawn SVG mockups. All three colour
variants are wired to photos:

```
public/bags/tote-black.png
public/bags/tote-navy.png
public/bags/tote-orange.png
```

Each swatch shows its photo when the file exists, and falls back to the drawn
SVG mockup automatically if a file is missing (no error).

## Aligning the print area

All three photos share one print area (they're the same bag, same framing),
defined as `PHOTO_PRINT_AREA` in `lib/products.ts`:

```ts
const PHOTO_PRINT_AREA = { x: 190, y: 292, width: 220, height: 202 }; // logical units (600² space)
```

These are an estimate. To calibrate: run the app, hover the viewer to reveal the
dashed print-area outline, and nudge the four numbers until the box sits on the
bag's front panel. If a colour needs a different zone, give that variant its own
`printArea` in `lib/products.ts`.

## Image guidance

- Square-ish images work best (they're scaled to *contain* within the viewer).
- Transparent or plain-white backgrounds look cleanest in the composite export.
- Keep the bag in the same position across colours so one print area fits all.
