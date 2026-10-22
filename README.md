# Paint Recreation

A clean-room, Paint-style drawing app built with React 19, TypeScript and Vite.
It recreates the core drawing workflow of Windows Paint from **public interface
metadata and observable behaviour only**. It contains no Microsoft code, icons,
cursors or other assets, and is not affiliated with Microsoft.

## Setup

**Prerequisites:** Node.js `^20.19.0` or `>=22.12.0` with npm. The end-to-end
tests also need an installed Google Chrome (or another Chromium browser).

```bash
npm install          # install dependencies (uses package-lock.json)
npm run dev          # development server at http://localhost:5173
npm run build        # type-check + production build to dist/
npm run lint         # oxlint
```

### End-to-end tests

The tests drive a real browser against the production build. Run the server in
one terminal and the tests in another:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort   # terminal 1
npm run test:e2e                                               # terminal 2
```

`test:e2e` uses `playwright-core` with an existing browser; no browser is
downloaded. It defaults to `C:\Program Files\Google\Chrome\Application\chrome.exe`.
On other systems set `CHROME_PATH`, for example
`CHROME_PATH=/usr/bin/google-chrome npm run test:e2e`. `APP_URL` overrides the
default `http://127.0.0.1:4173/`.

## Repository contents

| Path | Contents |
|---|---|
| `src/` | The app (see [Source layout](#source-layout)). |
| `tests/e2e.mjs` | End-to-end checks (drawing, pixels, PNG export, phone layout). |
| `docs/PHASE2_REA_FINDINGS.md` | REA metadata analysis of Windows Paint, with Evidence IDs. |
| `docs/FEATURE_MAP.md` | Paint metadata ↔ recreation mapping, fair-comparison notes, manual checks. |

**Not included:** the raw REA evidence bundles (`docs/evidence/`). They contain
data derived from Microsoft's binaries, so they are git-ignored. The Evidence IDs
quoted in the docs identify the records, but readers can't reproduce them without
running REA against their own copy of Paint 11.2605.81.0.

## Features

| Feature | How it works |
|---|---|
| Canvas | 960 × 600 opaque white bitmap; scales down to fit narrow screens with correct pointer mapping. |
| Pencil (P) | Hard-edged square stamps along a Bresenham line — no anti-aliasing. 1–16 px. |
| Brush (B) | Round, anti-aliased stroke smoothed with midpoint quadratic curves. 1–64 px. |
| Eraser (E) | Paints the background colour (white) with a square tip. 2–64 px. |
| Colours | Colour 1 (left button) and Colour 2 (right button); 20-swatch palette and a custom picker that set the active slot. |
| Size | Slider per tool; each tool remembers its own size. `[` / `]` adjust it. |
| Clear | Fills the canvas with white; undoable. |
| Undo / Redo | Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z. Last 30 states kept; a new action discards the redo branch. |
| Save | Save PNG button or Ctrl+S downloads `untitled.png`, pixel-identical to the canvas. |
| UI | Ribbon-style toolbar, status bar (cursor position, size, tool), light/dark theme, phone-width layout. |

## Source layout

```
src/paint/tools.ts       tool specs, palette, canvas constants
src/paint/raster.ts      pencil/eraser stamping, brush curves
src/paint/history.ts     snapshot undo/redo stack
src/components/          PaintCanvas (pointer input + imperative API), Ribbon, StatusBar, icons
tests/e2e.mjs            drag/pixel/PNG/responsive checks
docs/PHASE2_REA_FINDINGS.md   REA metadata analysis of Windows Paint
```

## Validation

### Current results — 2026-10-22, against the current build

| Check | Result |
|---|---|
| `npm run build` (`tsc -b && vite build`) | exit 0 — 23 modules, JS 229.90 kB (72.22 kB gzip), CSS 4.52 kB |
| `npm run lint` (oxlint) | exit 0, no warnings |
| `npm run test:e2e` (Chrome, served build `index-lVC20ma5.js`) | **12/12 passed**, exit 0, no console/page errors |
| REA phone-width scenario, 390 × 844 — `ev_eb78e0000fa6c588aca82008cc2a47a74455df9213fcd9a602ae93ecaea86a38` | 4/4 steps completed, no console/page errors; after a canvas click Undo became enabled and the screenshot shows an 8 px brush dot at the centre; layout fits on screen |

The REA scenario tool can only click, press keys and fill inputs, so drags and
pixel reads are covered by `tests/e2e.mjs`:

1. Canvas starts opaque white; Undo/Redo disabled
2. Pencil draws a 1 px line with only two colours in the region (no anti-aliasing)
3. Right button draws with Colour 2
4. Brush draws ~20 px wide with anti-aliased edges in the chosen colour
5. Sizes remembered per tool
6. Eraser restores background only along its path
7. Undo/redo stepping; a new action clears the redo branch
8. Clear is undoable
9. Saved file is a PNG, 960 × 600, pixel-identical to the canvas
10. Custom colour picker sets the active slot
11. History depth: 35 actions → exactly 29 undos
12. At 390 px wide: no horizontal page scroll; scaled-canvas strokes land at the right pixels

### Historical evidence — earlier builds, kept for the record

These REA runs were made against **earlier builds** and are not current results.

- `ev_682a88f064a731e2b28ed43afaa1571e2ff144ae1f59ecdfbf1645f2f55589ff` — 1280 × 720,
  13 actions all `completed`: pencil click, brush, red, size 40, click, Undo,
  Ctrl+Y, `E`, Clear, Ctrl+Z, Save. Accessibility snapshots showed the expected
  Undo/Redo states and per-tool sizes; the final screenshot showed the dot restored
  after Clear → Ctrl+Z. The Save download of `untitled.png` was reported as
  `download-cancelled` (REA's harness does not keep downloads; T9 verifies the file).
  Ran before the two later CSS-only changes; not re-run since.
- `ev_85d3d9c93f0821f90a0b6f789932da0f962b03954211f6560c7fb560fa28fe25` — 390 × 844,
  run **before** the fix for a 1 px horizontal overflow on phones. Superseded by
  `ev_eb78e000…`.

All REA records (Paint metadata and these browser runs) are in
`docs/evidence/rea-session-bundle-phase5.json`; the original metadata-only export
`rea-paint-metadata-bundle.json` is unchanged.

## Comparison with Windows Paint

Labels follow `docs/PHASE2_REA_FINDINGS.md`: **[REA]** = metadata evidence,
**[Assumption]** = not verified against a running Paint in this project.
**No Paint behaviour has been manually observed yet**, so every behavioural
statement about Paint below is an assumption. The per-feature mapping, the
fair-comparison breakdown and the manual checks are in
[`docs/FEATURE_MAP.md`](docs/FEATURE_MAP.md).

**Similar**
- Pencil / Brush / Eraser as separate tools; pencil hard-edged vs brush soft
  (`ToolKind` has `Precise` and `Broad` values **[REA]**; which tool has which kind,
  and how either draws, is **[Assumption]**).
- Two colour slots, active-slot editing, palette + custom colour
  (`PaintColorSlot.Color1/Color2/Background`, `IsColor1Active`, `EditColorsDialog` **[REA]**).
- Per-tool thickness ranges (`IToolInformation.Min/MaxThickness` **[REA]**).
- Eraser paints the background colour (`PaintColorSlot.Background` **[REA]**; semantics **[Assumption]**).
- Undo/Redo and Save as PNG (`IMenuBarViewModel.Undo/Redo/FileSaveAsPNG` **[REA]**); Ctrl+Z/Y/S **[Assumption]**.

**Different**
- **Clear / New**: Paint exposes `FileNew` and `CreateNewCanvas`, plus `SelectAll`
  and `ClearSelection`, but no method named `Clear` on a canvas **[REA]**. How
  those behave (prompt to save, undoable or not) is **[Assumption]**. This app has
  an explicit, undoable Clear button and no File → New. *(Corrected 2026-10-22: an
  earlier version said Paint had no clear or new-canvas method.)*
- Size is a continuous slider, not Paint's suggested-thickness presets **[REA: `SuggestedThicknesses`]**.
- Fixed 960 × 600 canvas; no resize, zoom, layers, selection, shapes, text, fill,
  colour picker tool, art brushes, or AI features — all present in Paint **[REA]**.
- PNG only (Paint also offers JPEG/BMP/GIF/project files **[REA]**); no Open, Print or file naming dialog.
- Eraser is square only (Paint has a round eraser too **[REA]**); the right button
  with the eraser does not do Paint's colour-replace.
- History is capped at 30 full snapshots (Paint's depth and strategy are unknown).
- Browser rendering (Canvas 2D) vs Win2D/Direct2D, so anti-aliasing and stroke
  shape will not match pixel-for-pixel.

## Limitations of the analysis

- Only metadata was inspected: PE resources of `mspaint.exe` and the WinRT
  interface metadata in `PaintUI.winmd`. No decompilation (by agreement, and no
  native engine is installed). Nothing about Paint's actual algorithms is known.
- REA's native UI observation tools are macOS-only, so no runtime capture of Paint
  was possible. No Paint behaviour has been manually observed yet; the checks to
  run are M1–M8 in `docs/FEATURE_MAP.md`.
- Tool-to-`ToolKind` mapping, size values, eraser output colour and history depth
  are not in the metadata and remain unknown.
- Brush feel was verified only by synthetic mouse input; pen pressure is not used.
- `docs/evidence/` holds the raw REA bundle derived from Microsoft files; it is
  git-ignored and should not be redistributed.
