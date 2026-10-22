import { useCallback, useEffect, useRef, useState } from 'react'
import { PaintCanvas, type HistoryState, type PaintCanvasHandle } from './components/PaintCanvas'
import { Ribbon } from './components/Ribbon'
import { StatusBar } from './components/StatusBar'
import type { Point } from './paint/raster'
import { TOOL_ORDER, TOOLS, type ColorSlot, type ToolId } from './paint/tools'

const initialSizes = Object.fromEntries(TOOL_ORDER.map((id) => [id, TOOLS[id].defaultSize])) as Record<ToolId, number>
const clampSize = (tool: ToolId, size: number) => Math.min(TOOLS[tool].maxSize, Math.max(TOOLS[tool].minSize, size))

export default function App() {
  const canvasRef = useRef<PaintCanvasHandle>(null)
  const [tool, setTool] = useState<ToolId>('pencil')
  const [sizes, setSizes] = useState(initialSizes)
  const [color1, setColor1] = useState('#000000')
  const [color2, setColor2] = useState('#ffffff')
  const [activeSlot, setActiveSlot] = useState<ColorSlot>('color1')
  const [history, setHistory] = useState<HistoryState>({ canUndo: false, canRedo: false })
  const [cursor, setCursor] = useState<Point | null>(null)

  const size = sizes[tool]
  const setSize = useCallback(
    (next: number) => setSizes((prev) => ({ ...prev, [tool]: clampSize(tool, next) })),
    [tool],
  )
  const pickColor = (color: string) => (activeSlot === 'color1' ? setColor1 : setColor2)(color)
  const save = () => canvasRef.current?.savePng('untitled.png')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (e.ctrlKey || e.metaKey) {
        if (key === 'z' && !e.shiftKey) canvasRef.current?.undo()
        else if (key === 'y' || (key === 'z' && e.shiftKey)) canvasRef.current?.redo()
        else if (key === 's') canvasRef.current?.savePng('untitled.png')
        else return
        e.preventDefault()
        return
      }
      if (e.altKey || (e.target instanceof HTMLInputElement && e.target.type !== 'range')) return
      const shortcut = TOOL_ORDER.find((id) => TOOLS[id].shortcut.toLowerCase() === key)
      if (shortcut) setTool(shortcut)
      else if (key === '[') setSize(size - 1)
      else if (key === ']') setSize(size + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSize, size])

  return (
    <div className="app">
      <Ribbon
        tool={tool}
        size={size}
        color1={color1}
        color2={color2}
        activeSlot={activeSlot}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onToolChange={setTool}
        onSizeChange={setSize}
        onActiveSlotChange={setActiveSlot}
        onColorPick={pickColor}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onClear={() => canvasRef.current?.clear()}
        onSave={save}
      />
      <main className="workspace">
        <PaintCanvas
          ref={canvasRef}
          tool={tool}
          size={size}
          color1={color1}
          color2={color2}
          onHistoryChange={setHistory}
          onCursorChange={setCursor}
        />
      </main>
      <StatusBar cursor={cursor} tool={tool} size={size} />
    </div>
  )
}
