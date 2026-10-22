export type ToolId = 'pencil' | 'brush' | 'eraser'

export interface ToolSpec {
  id: ToolId
  label: string
  shortcut: string
  minSize: number
  maxSize: number
  defaultSize: number
}

// Each tool keeps its own size range, mirroring the per-tool Min/MaxThickness
// exposed by Paint's UI layer (see docs/PHASE2_REA_FINDINGS.md). The numbers
// themselves are our own choice.
export const TOOLS: Record<ToolId, ToolSpec> = {
  pencil: { id: 'pencil', label: 'Pencil', shortcut: 'P', minSize: 1, maxSize: 16, defaultSize: 1 },
  brush: { id: 'brush', label: 'Brush', shortcut: 'B', minSize: 1, maxSize: 64, defaultSize: 8 },
  eraser: { id: 'eraser', label: 'Eraser', shortcut: 'E', minSize: 2, maxSize: 64, defaultSize: 16 },
}

export const TOOL_ORDER: ToolId[] = ['pencil', 'brush', 'eraser']

export const CANVAS_WIDTH = 960
export const CANVAS_HEIGHT = 600
export const BACKGROUND = '#ffffff'

export const PALETTE = [
  '#000000', '#7f7f7f', '#c3c3c3', '#ffffff',
  '#8b1a1a', '#e53935', '#ff8a65', '#f4a6c6',
  '#ef6c00', '#ffb300', '#fdd835', '#fff59d',
  '#2e7d32', '#7cb342', '#26a69a', '#80deea',
  '#1565c0', '#42a5f5', '#5e35b1', '#ab47bc',
]

export type ColorSlot = 'color1' | 'color2'
