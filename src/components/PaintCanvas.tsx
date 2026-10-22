import { useEffect, useImperativeHandle, useRef, type PointerEvent, type Ref } from 'react'
import { History } from '../paint/history'
import { brushCurve, brushDot, midpoint, stampLine, type Point } from '../paint/raster'
import { BACKGROUND, CANVAS_HEIGHT, CANVAS_WIDTH, type ToolId } from '../paint/tools'

export interface PaintCanvasHandle {
  undo(): void
  redo(): void
  clear(): void
  savePng(filename: string): void
}

export interface HistoryState {
  canUndo: boolean
  canRedo: boolean
}

interface Stroke {
  pointerId: number
  tool: ToolId
  size: number
  color: string
  last: Point
  lastMid: Point
}

interface Props {
  ref: Ref<PaintCanvasHandle>
  tool: ToolId
  size: number
  color1: string
  color2: string
  onHistoryChange(state: HistoryState): void
  onCursorChange(point: Point | null): void
}

export function PaintCanvas({ ref, tool, size, color1, color2, onHistoryChange, onCursorChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const outlineRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const historyRef = useRef(new History())
  const strokeRef = useRef<Stroke | null>(null)

  const snapshot = () => ctxRef.current!.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const reportHistory = () => {
    const h = historyRef.current
    onHistoryChange({ canUndo: h.canUndo, canRedo: h.canRedo })
  }

  const restore = (image: ImageData | null) => {
    if (!image) return
    ctxRef.current!.putImageData(image, 0, 0)
    reportHistory()
  }

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d', { willReadFrequently: true })!
    ctxRef.current = ctx
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    historyRef.current.reset(snapshot())
    reportHistory()
    // Runs once: the canvas and its history live for the component's lifetime.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    undo: () => restore(historyRef.current.undo()),
    redo: () => restore(historyRef.current.redo()),
    clear() {
      if (strokeRef.current) return
      const ctx = ctxRef.current!
      ctx.fillStyle = BACKGROUND
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      historyRef.current.push(snapshot())
      reportHistory()
    },
    savePng(filename) {
      canvasRef.current!.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }, 'image/png')
    },
  }))

  // Map from CSS pixels to canvas pixels; the canvas may be scaled down to fit.
  const toCanvas = (e: { clientX: number; clientY: number }): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) * CANVAS_WIDTH) / rect.width,
      y: ((e.clientY - rect.top) * CANVAS_HEIGHT) / rect.height,
    }
  }

  const paintSegment = (s: Stroke, p: Point) => {
    const ctx = ctxRef.current!
    if (s.tool === 'brush') {
      const mid = midpoint(s.last, p)
      brushCurve(ctx, s.lastMid, s.last, mid, s.size, s.color)
      s.lastMid = mid
    } else {
      stampLine(ctx, s.last, p, s.size, s.color)
    }
    s.last = p
  }

  const moveOutline = (e: PointerEvent<HTMLCanvasElement> | null) => {
    const outline = outlineRef.current!
    if (!e || tool === 'pencil') {
      outline.style.display = 'none'
      return
    }
    const rect = canvasRef.current!.getBoundingClientRect()
    const diameter = (size * rect.width) / CANVAS_WIDTH
    outline.style.display = 'block'
    outline.style.width = `${diameter}px`
    outline.style.height = `${diameter}px`
    outline.style.borderRadius = tool === 'brush' ? '50%' : '0'
    outline.style.transform = `translate(${e.clientX - rect.left - diameter / 2}px, ${e.clientY - rect.top - diameter / 2}px)`
  }

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (strokeRef.current || (e.button !== 0 && e.button !== 2)) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toCanvas(e)
    // Primary button draws with Color 1, secondary with Color 2; the eraser
    // always paints the background colour.
    const color = tool === 'eraser' ? BACKGROUND : e.button === 2 ? color2 : color1
    const ctx = ctxRef.current!
    if (tool === 'brush') brushDot(ctx, p, size, color)
    else stampLine(ctx, p, p, size, color)
    strokeRef.current = { pointerId: e.pointerId, tool, size, color, last: p, lastMid: p }
  }

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    moveOutline(e)
    const p = toCanvas(e)
    onCursorChange({ x: Math.floor(p.x), y: Math.floor(p.y) })
    const s = strokeRef.current
    if (!s || e.pointerId !== s.pointerId) return
    const samples = e.nativeEvent.getCoalescedEvents?.() ?? []
    for (const sample of samples.length ? samples : [e.nativeEvent]) paintSegment(s, toCanvas(sample))
  }

  const finishStroke = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = strokeRef.current
    if (!s || e.pointerId !== s.pointerId) return
    if (s.tool === 'brush') brushCurve(ctxRef.current!, s.lastMid, s.last, s.last, s.size, s.color)
    strokeRef.current = null
    historyRef.current.push(snapshot())
    reportHistory()
  }

  const handlePointerLeave = () => {
    moveOutline(null)
    onCursorChange(null)
  }

  return (
    <div className="canvas-frame">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        data-testid="paint-canvas"
        data-tool={tool}
        aria-label={`Drawing canvas, ${CANVAS_WIDTH} by ${CANVAS_HEIGHT} pixels`}
        role="img"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onLostPointerCapture={finishStroke}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div ref={outlineRef} className="size-outline" aria-hidden="true" />
    </div>
  )
}
