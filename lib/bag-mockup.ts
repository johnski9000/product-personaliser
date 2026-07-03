/**
 * Programmatically drawn tote-bag mockup, one per colour variant.
 *
 * Returned as an SVG `data:` URL so Fabric can load it as a background image
 * without tainting the canvas (data URLs are same-origin), which keeps the
 * composite PNG export clean. The SVG is authored in the same 600x600 logical
 * space as the viewer (see ProductConfig.canvasSize), so it maps 1:1.
 */

import type { Variant } from "./products";

/**
 * Build the raw SVG markup for a bag in the given variant colours.
 * `size` should match the product's logical canvas size.
 */
export function buildToteSvg(variant: Variant, size = 600): string {
  const { body, handle, outline, stitch } = variant.mockup;

  // Body panel geometry (logical units). The print area in products.ts is
  // centred within this rectangle.
  const bodyX = 132;
  const bodyY = 180;
  const bodyW = 336;
  const bodyH = 366;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="0.5" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.10"/>
    </linearGradient>
  </defs>

  <!-- contact shadow -->
  <ellipse cx="300" cy="556" rx="168" ry="16" fill="#000000" opacity="0.10"/>

  <!-- handles (drawn behind the body so they read as straps out of the top) -->
  <path d="M198 214 C 198 104, 266 104, 266 214" fill="none" stroke="${handle}" stroke-width="15" stroke-linecap="round"/>
  <path d="M334 214 C 334 104, 402 104, 402 214" fill="none" stroke="${handle}" stroke-width="15" stroke-linecap="round"/>

  <!-- body panel -->
  <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="14" fill="${body}" stroke="${outline}" stroke-width="2"/>

  <!-- top hem stitch line -->
  <line x1="${bodyX + 12}" y1="${bodyY + 26}" x2="${bodyX + bodyW - 12}" y2="${bodyY + 26}" stroke="${stitch}" stroke-width="2" stroke-dasharray="7 5" opacity="0.7"/>

  <!-- soft directional shading for depth -->
  <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="14" fill="url(#shade)"/>
</svg>`;
}

/** Build an SVG `data:` URL for the given variant. */
export function toteDataUrl(variant: Variant, size = 600): string {
  const svg = buildToteSvg(variant, size);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
