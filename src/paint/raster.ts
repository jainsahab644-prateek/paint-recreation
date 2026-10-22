export interface Point {
  x: number
  y: number
}

// Hard-edged square stamps along a Bresenham line. Integer-aligned fillRect
// calls never anti-alias, which gives the crisp pixel look of a pencil/eraser.
export function stampLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  size: number,
  color: string,
) {
  ctx.fillStyle = color
  const offset = Math.floor(size / 2)
  let x = Math.floor(from.x)
  let y = Math.floor(from.y)
  const xEnd = Math.floor(to.x)
  const yEnd = Math.floor(to.y)
  const dx = Math.abs(xEnd - x)
  const dy = -Math.abs(yEnd - y)
  const sx = x < xEnd ? 1 : -1
  const sy = y < yEnd ? 1 : -1
  let err = dx + dy

  for (;;) {
    ctx.fillRect(x - offset, y - offset, size, size)
    if (x === xEnd && y === yEnd) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
}

export function brushDot(ctx: CanvasRenderingContext2D, p: Point, size: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2)
  ctx.fill()
}

// Smooth round stroke: a quadratic curve from the previous midpoint, bending
// through the last sampled point, to the new midpoint.
export function brushCurve(
  ctx: CanvasRenderingContext2D,
  from: Point,
  control: Point,
  to: Point,
  size: number,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.quadraticCurveTo(control.x, control.y, to.x, to.y)
  ctx.stroke()
}

export const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
