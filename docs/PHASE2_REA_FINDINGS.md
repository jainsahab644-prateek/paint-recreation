# Phase 2 — Windows Paint: REA metadata findings

Target: **Microsoft.Paint 11.2605.81.0 (x64, Microsoft Store package)**
Install location (read-only, not modified):
`C:\Program Files\WindowsApps\Microsoft.Paint_11.2605.81.0_x64__8wekyb3d8bbwe`

Scope agreed with the project owner: **metadata only** — PE resources and the
public WinRT interface metadata in `PaintUI.winmd`. No native decompilation,
no disassembly, no code execution of Paint, no assets copied.

Every statement below carries one of three labels:

| Label | Meaning |
|---|---|
| **[REA]** | Produced by a REA tool during the analysis (2026-10-22); Evidence ID given. |
| **[Observed]** | Seen directly during the analysis with ordinary OS tooling (file listing, manifest). |
| **[Assumption]** | Inference or general knowledge. Not verified against Paint. |

The raw REA Evidence bundle (8 records) is in
`docs/evidence/rea-paint-metadata-bundle.json`. A later export from the same
REA session, `docs/evidence/rea-session-bundle-phase5.json` (11 records),
contains those 8 records byte-identical plus 3 browser runs of our own app.
Both contain names and hashes derived from Microsoft's files, so they are
git-ignored and should not be redistributed.

**Revision 2026-10-22:** the clear/new-canvas finding was corrected and the
`IToolInformation` members added (see those sections). Paint's version and
file hashes were re-checked and are unchanged. Feature-by-feature mapping and
manual checks: [`FEATURE_MAP.md`](FEATURE_MAP.md).

---

## 1. Application structure

- **[Observed]** Packaged MSIX app; manifest entry `PaintApp\mspaint.exe`,
  `EntryPoint = Windows.FullTrustApplication`.
- **[Observed]** Package dependencies: `Microsoft.WindowsAppRuntime.2`,
  `Microsoft.VCLibs.140.00`, `Microsoft.VCLibs.140.00.UWPDesktop`.
- **[Observed]** Ships `Microsoft.Graphics.Canvas.dll` (Win2D) and native modules
  `PaintTools.dll`, `BasePaint.dll`, `PaintUI.dll`, `ImageProcessing.dll`,
  `ProjectFile.dll`, `RestartRecovery.dll`, plus AI modules
  (`AIServices*.dll`, `PaintAIManager.dll`, `PerceptiveShell\*`, ONNX runtime).
- **[Assumption]** From the dependencies: a native C++ WinUI 3 desktop app
  rendering through Win2D/Direct2D. Module names suggest responsibilities, but
  the code inside them was **not** analysed.

### `mspaint.exe` PE resources
**[REA]** `inspect_pe_resources` — `ev_8bdf596c479765a5ae8de8f32d29c9a411e58484590142399c6a1f5e07a3a584`
(confidence `observed`, coverage `complete`, 215 directory entries examined)

- PE32+, x86-64, SHA-256 `d94d89377a2a78a73b95cff70fc7706df9ae2ae53175bd6d26abb8301e36ecd9`.
- 102 resources: 28 × type 1 (RT_CURSOR), 28 × type 12 (RT_GROUP_CURSOR),
  16 × type 3 (RT_ICON), 2 × type 14 (RT_GROUP_ICON), 3 × type 5 (RT_DIALOG),
  1 × type 2 (RT_BITMAP), 1 × type 16 (RT_VERSION), 1 × type 24 (RT_MANIFEST),
  20 × named `IMAGE`, plus two EDP app-info entries.
- **[Assumption]** 28 cursor groups suggest per-tool cursors (pencil, brush,
  eraser, picker…). REA states that non-icon payloads are opaque, so this is
  not confirmed.

### `PaintUI.winmd` identity
**[REA]** `inspect_managed_artifact` — `ev_94fd000d10b7402627582cf711697413ff4f116bcb0b4b36330624f6d9c73325`
(summary view `ev_9b2daf936fd1c0a305bd951beb217f29e63ef10fbd98c9f1e24fe9dda5abdda2`)

- Metadata-only file (`WindowsRuntime 1.4`, CLI `il-only`, no entry point),
  MVID `4627c2e4-44aa-40e4-90be-2f08f770551b`.
- 588 TypeDefs, 4,165 MethodDefs, 2,125 properties, 95 events.

**[REA]** `inspect_managed_members` (all types) — `ev_4e469ef71e17896ddb6b087b80c38b89a412ea440d2710100b1fec50d61eb8ff`
- `call_edges = 0`, `user_strings = 0`: as expected for a `.winmd`, there are
  **no method bodies**. The file shows *what the UI layer exposes*, never *how*
  it is implemented.

Pages read in full: types `ev_405ae536…f461` (588/588),
methods `ev_57881b9e…48d2` (4,165/4,165).
Targeted member decode: `ev_693bf744abe35c896f88bc618c5ff732736a1cba1c881a7e615ac39dc5311abf`.

---

## 2. Feature findings

### Drawing canvas
- **[REA]** Types `PaintUI.Canvas`, `CanvasAdapter`, `ICanvasEventHandler`,
  `DirectXContext`, `SwapChainContext`, `IRenderContext`, `LayersPanel`,
  `ILayer`, `ZoomViewModel`, `ZoomMode`.
- **[Assumption]** The canvas is a GPU swap-chain surface with layers and zoom.
  Stroke rasterisation lives outside `PaintUI.winmd` (not inspected).

### Pencil and brush tools
- **[REA]** `IToolsViewModel` exposes `SelectPencilTool`, `SelectBrushTool`,
  `SelectCalligraphyBrushTool`, `SelectCalligraphyPenTool`, `SelectAirbrushTool`,
  `SelectOilBrushTool`, `SelectCrayonTool`, `SelectMarkerTool`,
  `SelectNaturalPencilTool`, `SelectWatercolorTool` with matching
  `Is…ToolSelected` getters.
- **[REA]** Enum `PaintUI.ToolKind` = `Selection, Shape, Text, Precise, Broad, Other`.
- **[Assumption]** "Precise" vs "Broad" separates hard pixel tools (pencil)
  from soft/wide tools (brushes) — reflected in our pencil (aliased) vs brush
  (anti-aliased) split. Exact stroke algorithms are unknown.

### Colour selection
- **[REA]** Enum `PaintUI.PaintColorSlot` = `Color1, Color2, Background`.
- **[REA]** `IColorsViewModel`: `SelectedColor1`, `SelectedColor2`,
  `IsColor1Active`, `SetActiveColor`, `SetInactiveColor`, `CustomColors`,
  `ShowEditColors`.
- **[REA]** `IEditColorsDialogViewModel`: `Colors`, `CustomColors`,
  `AddCustomColor`. `IToolsViewModel.SelectPickColorTool` exists.
- **[Assumption]** Left mouse draws with Color 1, right mouse with Color 2
  (long-standing Paint behaviour; not re-verified here).

### Brush size
- **[REA]** `IBrushSizeViewModel`: `SuggestedThicknesses`,
  `SelectedSuggestedThickness`, `BeginPreviewSetThickness`/`EndPreviewSetThickness`.
- **[REA]** `IBrushSizeSliderViewModel`: `SelectedIndex`, `MinIndex`, `MaxIndex`, `ToolKind`.
- **[REA]** `IToolInformation`: `MinThickness`, `MaxThickness`.
  `ThicknessIndexConverter` has a `ToolKind` property.
- **[REA]** `ICommandHost.CurrentThickness`, `ExecuteSetThickness`.
- **[Assumption]** Size is a slider over per-tool presets, with a different
  min/max per tool. Actual numeric ranges are not in the metadata.

### Tool metadata (`IToolInformation`) — added 2026-10-22
- **[REA]** (methods page `ev_57881b9e…48d2`) `IToolInformation` declares
  `Cursor`, `CursorVisual`, `Kind`, `MinThickness`, `MaxThickness`, `IsDrawing`,
  `IsEditing`, `Cancel`, `CanvasActions`, `IsCanvasResizeEnabled`, `IsFillEnabled`,
  `HapticsWaveform`, `AutomationName`, `AutomationHelpText`.
- **[Assumption]** These are interface names only. `Cursor`/`CursorVisual`
  together with the 28 cursor groups in `mspaint.exe` are *consistent with*
  per-tool cursors, and `Kind` suggests each tool reports a `ToolKind`, but the
  metadata does not show what any member returns, which tool has which kind, or
  how Paint uses them.

### Eraser
- **[REA]** `SelectEraserTool`, `SelectRoundEraserTool`, `SelectMagicEraserTool`
  (AI), and `PaintColorSlot.Background`.
- **[Assumption]** The classic eraser paints the background colour rather than
  making pixels transparent; there are square and round variants.

### Clear canvas / new canvas — corrected 2026-10-22
- **[REA]** (methods page `ev_57881b9e…48d2`) A new canvas is exposed as
  `IMenuBarViewModel.FileNew` and `ICommandHost.CreateNewCanvas`. Selection
  members: `IToolsViewModel.SelectAll`, `IToolsViewModel.ClearSelection`,
  `ICanvasContextMenuViewModel.ClearSelection`. No method named `Clear` or
  `ClearCanvas` exists on a canvas view-model.
- **Correction:** the original version of this section said no Clear/NewImage-like
  method existed. That was wrong: the search pattern used did not match
  `FileNew` or `CreateNewCanvas`. The names were present in the evidence all along.
- **[Assumption]** Paint clears via *Select all → Delete* or *File → New*.
  Whether `ClearSelection` deletes pixels or only deselects, and whether
  *File → New* can be undone, cannot be determined from names. Our app's
  explicit, undoable **Clear** button is a deliberate difference.

### Undo / redo
- **[REA]** `IMenuBarViewModel`: `Undo`, `Redo`, `IsUndoEnabled`, `IsRedoEnabled`.
- **[Assumption]** Ctrl+Z / Ctrl+Y shortcuts; history depth unknown.

### Saving
- **[REA]** `IMenuBarViewModel`: `FileSave`, `FileSaveAs`, `FileSaveAsPNG`,
  `FileSaveAsJPEG`, `FileSaveAsBMP`, `FileSaveAsGIF`, `FileSaveAsProject`,
  `FileSaveAsOther`, `IsSaveAsPNGEnabled` (…per format), `FileOpen`,
  `OpenRecentFile`, `Print`, `PrintPreview`.
- **[Observed]** `ProjectFile.dll` exists (consistent with `FileSaveAsProject`).
- **[Assumption]** PNG export is flattened, opaque on white unless transparency
  is used. Our app exports PNG only.

---

## 3. What this analysis does **not** establish
- Stroke algorithms, smoothing, anti-aliasing, pressure handling.
- Exact size ranges, palette colours, default canvas size.
- Undo depth or memory strategy; file encoder settings.
- Any runtime behaviour — REA's native UI observation tools are Mach-O-only
  and were not usable on this Windows target.
- **No Paint behaviour has been manually observed yet** (as of 2026-10-22). Every
  behavioural statement here is an [Assumption] until the manual checks in
  `FEATURE_MAP.md` are run.
