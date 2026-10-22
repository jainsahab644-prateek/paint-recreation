# Feature map — Windows Paint metadata ↔ Paint Recreation

Last updated: 2026-10-22. Target: Microsoft.Paint 11.2605.81.0 (x64).
Hashes re-checked on 2026-10-22 and unchanged since the analysis:
`mspaint.exe` `d94d8937…36ecd9`, `PaintUI.winmd` `b37acd57…7ff274`.

This document matches names found in Paint's **interface metadata** to
features in our app. It does **not** describe how Paint works internally: no
code was decompiled or analysed, and nothing here is a claim about Paint's
algorithms.

## Evidence categories

| Tag | Meaning |
|---|---|
| **REA** | A name or count produced by a REA tool, with its Evidence ID. Shows that something *exists* in the metadata, not how it behaves. |
| **Observed (Paint)** | Behaviour seen by a person using Windows Paint. **None recorded yet** — see the [manual checklist](#manual-checks-to-run-in-windows-paint). |
| **Implemented (ours)** | What our app does, independently written, with the automated test that checks it. |
| **Assumption** | Inference or general knowledge. Not verified. |

### Evidence IDs

| Key | Evidence ID | Tool | Status |
|---|---|---|---|
| E1 | `ev_8bdf596c479765a5ae8de8f32d29c9a411e58484590142399c6a1f5e07a3a584` | `inspect_pe_resources` on `mspaint.exe` | current |
| E2 | `ev_94fd000d10b7402627582cf711697413ff4f116bcb0b4b36330624f6d9c73325` | `inspect_managed_artifact` on `PaintUI.winmd` | current |
| E3 | `ev_4e469ef71e17896ddb6b087b80c38b89a412ea440d2710100b1fec50d61eb8ff` | `inspect_managed_members` (all types); pages: types `ev_405ae536…f461`, methods `ev_57881b9e…48d2` | current |
| E4 | `ev_693bf744abe35c896f88bc618c5ff732736a1cba1c881a7e615ac39dc5311abf` | `inspect_managed_members` (selected types, incl. enum values) | current |
| B3 | `ev_eb78e0000fa6c588aca82008cc2a47a74455df9213fcd9a602ae93ecaea86a38` | `capture_browser_scenario`, our app at 390 × 844 | current build |
| B1 | `ev_682a88f064a731e2b28ed43afaa1571e2ff144ae1f59ecdfbf1645f2f55589ff` | `capture_browser_scenario`, our app at 1280 × 720 | **historical** — earlier build |
| B2 | `ev_85d3d9c93f0821f90a0b6f789932da0f962b03954211f6560c7fb560fa28fe25` | `capture_browser_scenario`, our app at 390 × 844 | **historical** — before the 1 px overflow fix |

E1–E4 are in both `docs/evidence/rea-paint-metadata-bundle.json` (original, 8
records) and `docs/evidence/rea-session-bundle-phase5.json` (new export, 11
records: the same 8, byte-identical, plus B1–B3). Both files are git-ignored.
"T*n*" below refers to the numbered checks in `tests/e2e.mjs` (README list).

---

## Feature-by-feature

### 1. Canvas
- **REA (E3):** types `Canvas`, `CanvasAdapter`, `ICanvasEventHandler`, `DirectXContext`,
  `SwapChainContext`, `LayersPanel`, `ILayer`, `ZoomViewModel`.
  `ICommandHost.CreateNewCanvas`, `IToolInformation.IsCanvasResizeEnabled`.
- **Observed (Paint):** none.
- **Implemented (ours):** fixed 960 × 600 opaque white canvas, scaled to fit narrow
  screens with corrected pointer mapping (T1, T12; B3).
- **Assumption:** Paint renders on a GPU surface with layers and zoom; its default
  canvas size is unknown.

### 2. Pencil
- **REA (E3):** `IToolsViewModel.SelectPencilTool`, `IsPencilToolSelected`
  (also `SelectNaturalPencilTool`, an art pencil). **(E4)** enum `ToolKind` =
  `Selection, Shape, Text, Precise, Broad, Other`; `IToolInformation.Kind` exists.
- **Observed (Paint):** none.
- **Implemented (ours):** hard-edged square stamps, no anti-aliasing, 1–16 px (T2).
- **Assumption:** the metadata does **not** say which tool has which `ToolKind`.
  "Pencil = Precise" is our guess from the names. Paint's pencil being aliased
  is general knowledge, not verified here.

### 3. Brush
- **REA (E3):** `SelectBrushTool` plus `SelectCalligraphyBrushTool`, `SelectCalligraphyPenTool`,
  `SelectAirbrushTool`, `SelectOilBrushTool`, `SelectCrayonTool`, `SelectMarkerTool`,
  `SelectWatercolorTool`.
- **Observed (Paint):** none.
- **Implemented (ours):** one round anti-aliased brush smoothed with quadratic
  curves, 1–64 px (T4). The art brushes are not implemented.
- **Assumption:** Paint's plain brush is soft-edged; its smoothing is unknown.

### 4. Eraser
- **REA (E3):** `SelectEraserTool`, `SelectRoundEraserTool`, `SelectMagicEraserTool` (AI).
  **(E4)** `PaintColorSlot.Background`.
- **Observed (Paint):** none.
- **Implemented (ours):** square tip that paints white, 2–64 px (T6).
- **Assumption:** what Paint's eraser leaves behind (white, Colour 2, or
  transparency) is **unknown**; the `Background` slot name does not say.

### 5. Colours
- **REA (E3/E4):** `PaintColorSlot` = `Color1, Color2, Background`;
  `IColorsViewModel.SelectedColor1`, `SelectedColor2`, `IsColor1Active`, `SetActiveColor`,
  `SetInactiveColor`, `CustomColors`, `ShowEditColors`;
  `IEditColorsDialogViewModel.AddCustomColor`; `IToolsViewModel.SelectPickColorTool`.
- **Observed (Paint):** none.
- **Implemented (ours):** Colour 1 / Colour 2 slots with an active slot; palette
  and custom picker set the active slot; left button draws Colour 1, right button
  Colour 2 (T3, T10). No colour-picker (eyedropper) tool.
- **Assumption:** the left/right mouse mapping is general Paint knowledge, not
  verified here.

### 6. Brush size
- **REA (E3):** `IBrushSizeViewModel.SuggestedThicknesses`, `SelectedSuggestedThickness`;
  `IBrushSizeSliderViewModel.SelectedIndex`, `MinIndex`, `MaxIndex`, `ToolKind`;
  `IToolInformation.MinThickness`, `MaxThickness`;
  `ICommandHost.CurrentThickness`, `ExecuteSetThickness`.
- **Observed (Paint):** none.
- **Implemented (ours):** continuous slider per tool, each tool remembers its
  size, `[`/`]` shortcuts (T4, T5).
- **Assumption:** the names suggest an index-based slider over per-tool presets
  with per-tool limits. The actual values and whether size is remembered per tool
  are unknown.

### 7. Clear / new canvas — *corrected 2026-10-22*
- **REA (E3):** `IMenuBarViewModel.FileNew`, `ICommandHost.CreateNewCanvas`,
  `IToolsViewModel.SelectAll`, `IToolsViewModel.ClearSelection`,
  `ICanvasContextMenuViewModel.ClearSelection`. There is no method named
  `Clear` or `ClearCanvas` on a canvas view-model.
  *Earlier reports said there was no clear or new-canvas method; that was wrong —
  `FileNew` and `CreateNewCanvas` were missed by the original search pattern.*
- **Observed (Paint):** none.
- **Implemented (ours):** a **Clear** button that fills white and can be undone (T8).
  There is no File → New.
- **Assumption:** from the names alone it is unknown whether `ClearSelection`
  deletes pixels or only deselects, and whether File → New can be undone (it may
  prompt to save instead).

### 8. Undo / redo
- **REA (E3):** `IMenuBarViewModel.Undo`, `Redo`, `IsUndoEnabled`, `IsRedoEnabled`.
  (`ITextEditAdapter` has its own `Undo`/`Redo` for the text tool.)
- **Observed (Paint):** none.
- **Implemented (ours):** Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z, toolbar buttons; last 30
  states; a new action discards redo (T7, T11; B3 shows Undo enabled after a dot).
- **Assumption:** Paint's shortcuts and history depth are unknown.

### 9. Saving
- **REA (E3):** `IMenuBarViewModel.FileSave`, `FileSaveAs`, `FileSaveAsPNG`, `FileSaveAsJPEG`,
  `FileSaveAsBMP`, `FileSaveAsGIF`, `FileSaveAsProject`, `FileSaveAsOther`,
  `IsSaveAsPNGEnabled` (one per format), `FileOpen`, `OpenRecentFile`, `Print`.
  **[Observed]** `ProjectFile.dll` ships in the package (file listing).
- **Observed (Paint):** none.
- **Implemented (ours):** Save PNG / Ctrl+S downloads `untitled.png`, 960 × 600,
  pixel-identical to the canvas (T9). No Open, other formats, or save dialog.
- **Assumption:** Paint's default file name and whether a saved PNG is opaque are unknown.

### 10. Cursors and tool metadata
- **REA (E1):** `mspaint.exe` contains 28 cursor groups (RT_GROUP_CURSOR) and 16 icons.
  Cursor images were not decoded.
- **REA (E3):** `IToolInformation` members: `Cursor`, `CursorVisual`, `Kind`,
  `MinThickness`, `MaxThickness`, `IsDrawing`, `IsEditing`, `Cancel`, `CanvasActions`,
  `IsCanvasResizeEnabled`, `IsFillEnabled`, `HapticsWaveform`, `AutomationName`,
  `AutomationHelpText`.
- **Observed (Paint):** none.
- **Implemented (ours):** a crosshair cursor plus a size outline for brush and eraser
  (not covered by automated tests).
- **Assumption:** `Cursor`/`CursorVisual` and the 28 cursor groups are
  *consistent with* per-tool cursors, but the metadata shows only that these
  members exist — not what they return or how Paint uses them. The other members
  are listed as names only; their meaning is inferred from their names.

---

## What can be compared fairly

| Comparison | Why |
|---|---|
| **Fair** — visible result of an action | Which tools exist; which mouse button draws which colour; what the eraser leaves behind; whether undo/redo work and their shortcuts; result of Clear vs Select all → Delete / File → New, and whether it can be undone; dimensions and opacity of a saved PNG. |
| **Approximate only** | Stroke look (anti-aliasing, smoothing, tip shape) and size ranges: Paint uses Win2D/Direct2D and its own units; we use the browser's Canvas 2D in canvas pixels. Cursor appearance and layout. |
| **Not comparable** | Paint's internal algorithms, rendering pipeline, undo memory strategy, file encoder settings, and AI features. The metadata contains names only, and none of these were analysed. |

## Manual checks to run in Windows Paint

Use a new blank canvas for each check. Note what you see in the **Result** column;
these become the first **Observed (Paint)** entries.

| # | Check | Steps | Question to answer | Result |
|---|---|---|---|---|
| M1 | Right-button colour | Pick a Colour 2 different from Colour 1. With the pencil, draw with the left button, then the right. | Does the right button draw in Colour 2? | |
| M2 | Eraser result | Draw a black line. Set Colour 2 to red. Erase across the line. | Is the erased area white, red (Colour 2), or transparent? | |
| M3 | Pencil edges | Zoom in to 800 % on a diagonal pencil line at the smallest size. | Hard pixel steps only, or blended edge pixels? | |
| M4 | Size ranges | For pencil, brush and eraser, open the size control. | Smallest and largest size; presets or continuous? Does each tool remember its size? | |
| M5 | Undo / redo keys | Draw three strokes. Press Ctrl+Z twice, then Ctrl+Y. | Do both shortcuts work? Does Ctrl+Shift+Z redo? | |
| M6 | Clearing | (a) Ctrl+A then Delete. (b) Draw again, then File → New. | (a) Is the canvas filled white, and can Ctrl+Z undo it? (b) Does it prompt to save; can it be undone? | |
| M7 | Save PNG | Draw something, File → Save as → PNG. | Default file name? Do the image size and pixels match the canvas (open it elsewhere)? Is the background white or transparent? | |
| M8 | Default canvas | Start Paint fresh. | Default canvas width × height (shown in the status bar). | |
