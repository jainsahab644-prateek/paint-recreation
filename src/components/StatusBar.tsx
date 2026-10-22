import type { Point } from '../paint/raster'
import { CANVAS_HEIGHT, CANVAS_WIDTH, TOOLS, type ToolId } from '../paint/tools'

interface Props {
  cursor: Point | null
  tool: ToolId
  size: number
}

export function StatusBar({ cursor, tool, size }: Props) {
  return (
    <footer className="status-bar">
      <span data-testid="status-cursor">{cursor ? `${cursor.x}, ${cursor.y}px` : '—'}</span>
      <span>{CANVAS_WIDTH} × {CANVAS_HEIGHT}px</span>
      <span data-testid="status-tool">{TOOLS[tool].label} · {size}px</span>
      <span className="status-note">Clean-room recreation · not affiliated with Microsoft</span>
    </footer>
  )
}
