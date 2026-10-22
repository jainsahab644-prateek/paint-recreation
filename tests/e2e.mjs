// End-to-end checks that need real pointer drags and pixel reads, which REA's
// browser scenario actions (click/press/fill only) cannot express.
// Usage: npm run preview (port 4173), then `npm run test:e2e`.
import { chromium } from 'playwright-core'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL = process.env.APP_URL ?? 'http://127.0.0.1:4173/'
const CHROME = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const W = 960
const H = 600

const results = []
async function check(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
  } catch (err) {
    results.push({ name, ok: false, err: err.message })
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const errors = []

async function openPage(viewport = { width: 1280, height: 900 }) {
  const page = await browser.newPage({ viewport, acceptDownloads: true })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  await page.goto(URL)
  await page.getByTestId('paint-canvas').waitFor()
  return page
}

const canvasBox = (page) => page.getByTestId('paint-canvas').boundingBox()
async function toPage(page, x, y) {
  const b = await canvasBox(page)
  return { x: b.x + (x * b.width) / W, y: b.y + (y * b.height) / H }
}
async function drag(page, points, button = 'left') {
  const first = await toPage(page, ...points[0])
  await page.mouse.move(first.x, first.y)
  await page.mouse.down({ button })
  for (const pt of points.slice(1)) {
    const p = await toPage(page, ...pt)
    await page.mouse.move(p.x, p.y, { steps: 12 })
  }
  await page.mouse.up({ button })
}
const pixel = (page, x, y) =>
  page.evaluate(([x, y]) => [...document.querySelector('canvas').getContext('2d').getImageData(x, y, 1, 1).data], [x, y])
const regionColors = (page, x, y, w, h) =>
  page.evaluate(([x, y, w, h]) => {
    const d = document.querySelector('canvas').getContext('2d').getImageData(x, y, w, h).data
    const set = new Set()
    for (let i = 0; i < d.length; i += 4) set.add(`${d[i]},${d[i + 1]},${d[i + 2]},${d[i + 3]}`)
    return [...set]
  }, [x, y, w, h])
const isBlank = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('canvas').getContext('2d').getImageData(0, 0, 960, 600).data
    return d.every((v) => v === 255)
  })
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
const BLACK = [0, 0, 0, 255]
const WHITE = [255, 255, 255, 255]
const RED = [0xe5, 0x39, 0x35, 255]
const BLUE = [0x15, 0x65, 0xc0, 255]

const page = await openPage()

await check('canvas starts opaque white, undo/redo disabled', async () => {
  assert(await isBlank(page), 'canvas not blank white')
  assert(await page.getByTestId('undo').isDisabled(), 'undo enabled')
  assert(await page.getByTestId('redo').isDisabled(), 'redo enabled')
})

await check('pencil: 1px aliased line in Colour 1 (black)', async () => {
  await drag(page, [[100, 100], [300, 100]])
  assert(eq(await pixel(page, 200, 100), BLACK), `mid pixel ${await pixel(page, 200, 100)}`)
  assert(eq(await pixel(page, 200, 101), WHITE), 'line thicker than 1px')
  const colors = await regionColors(page, 90, 95, 220, 10)
  assert(colors.length === 2, `expected only black+white (no anti-aliasing), got ${colors.length} colours`)
})

await check('pencil: right button draws with Colour 2', async () => {
  await page.getByTestId('slot-color2').click()
  await page.getByTestId('swatch-1565c0').click()
  await page.getByTestId('slot-color1').click()
  await drag(page, [[100, 150], [300, 150]], 'right')
  assert(eq(await pixel(page, 200, 150), BLUE), `got ${await pixel(page, 200, 150)}`)
})

await check('brush: smooth anti-aliased stroke at chosen size and colour', async () => {
  await page.getByTestId('tool-brush').click()
  await page.getByTestId('swatch-e53935').click()
  await page.getByTestId('size').fill('20')
  assert((await page.getByTestId('size-value').textContent()) === '20 px', 'size label')
  await drag(page, [[100, 300], [250, 350], [400, 300]])
  assert(eq(await pixel(page, 100, 300), RED), 'stroke start not red')
  assert(eq(await pixel(page, 100, 309), RED), 'stroke not ~20px wide')
  assert(eq(await pixel(page, 100, 314), WHITE), 'stroke wider than expected')
  const colors = await regionColors(page, 90, 285, 320, 80)
  assert(colors.length > 3, 'expected anti-aliased edge colours')
})

await check('sizes are remembered per tool', async () => {
  await page.getByTestId('tool-pencil').click()
  assert((await page.getByTestId('size').inputValue()) === '1', 'pencil size changed')
  await page.getByTestId('tool-brush').click()
  assert((await page.getByTestId('size').inputValue()) === '20', 'brush size lost')
})

await check('eraser paints background over existing pixels', async () => {
  await page.getByTestId('tool-eraser').click()
  await drag(page, [[150, 80], [150, 170]])
  assert(eq(await pixel(page, 150, 100), WHITE), 'black line not erased')
  assert(eq(await pixel(page, 150, 150), WHITE), 'blue line not erased')
  assert(eq(await pixel(page, 250, 100), BLACK), 'eraser affected outside its path')
})

await check('undo / redo step through actions; new action drops redo', async () => {
  await page.getByTestId('undo').click()
  assert(eq(await pixel(page, 150, 100), BLACK), 'undo did not restore erased pixels')
  await page.keyboard.press('Control+y')
  assert(eq(await pixel(page, 150, 100), WHITE), 'redo did not re-apply eraser')
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Control+z')
  assert(eq(await pixel(page, 100, 300), WHITE), 'brush stroke not undone')
  assert(!(await page.getByTestId('redo').isDisabled()), 'redo should be enabled')
  await page.getByTestId('tool-pencil').click()
  await drag(page, [[500, 500], [520, 500]])
  assert(await page.getByTestId('redo').isDisabled(), 'redo branch not discarded')
})

await check('clear canvas is undoable', async () => {
  await page.getByTestId('clear').click()
  assert(await isBlank(page), 'clear left pixels')
  await page.keyboard.press('Control+z')
  // Colour 1 is still red from the brush check.
  assert(eq(await pixel(page, 510, 500), RED), `undo after clear did not restore: ${await pixel(page, 510, 500)}`)
})

await check('save writes a 960×600 PNG identical to the canvas', async () => {
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('save').click()])
  assert(download.suggestedFilename() === 'untitled.png', `filename ${download.suggestedFilename()}`)
  const file = join(mkdtempSync(join(tmpdir(), 'paint-')), 'untitled.png')
  await download.saveAs(file)
  const bytes = readFileSync(file)
  assert(bytes.subarray(1, 4).toString() === 'PNG', 'not a PNG signature')
  const w = bytes.readUInt32BE(16)
  const h = bytes.readUInt32BE(20)
  assert(w === W && h === H, `PNG is ${w}x${h}`)
  const same = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const a = ctx.getImageData(0, 0, c.width, c.height).data
    const b = document.querySelector('canvas').getContext('2d').getImageData(0, 0, c.width, c.height).data
    return a.every((v, i) => v === b[i])
  }, bytes.toString('base64'))
  assert(same, 'PNG pixels differ from canvas')
})

await check('custom colour picker sets the active slot', async () => {
  await page.getByTestId('custom-color').fill('#12ab34')
  await drag(page, [[600, 50], [650, 50]])
  assert(eq(await pixel(page, 620, 50), [0x12, 0xab, 0x34, 255]), `got ${await pixel(page, 620, 50)}`)
})

await check('history keeps the last 30 states (29 undos)', async () => {
  const p = await openPage()
  for (let i = 0; i < 35; i++) await drag(p, [[20 + i * 5, 20], [20 + i * 5, 40]])
  let undos = 0
  while (!(await p.getByTestId('undo').isDisabled()) && undos < 50) {
    await p.getByTestId('undo').click()
    undos++
  }
  assert(undos === 29, `undid ${undos} times`)
  await p.close()
})

await check('phone width: no horizontal page scroll, scaled canvas maps pointer correctly', async () => {
  const p = await openPage({ width: 390, height: 844 })
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert(overflow <= 0, `page overflows by ${overflow}px`)
  const box = await canvasBox(p)
  assert(box.width <= 390 - 16, `canvas ${box.width}px wide`)
  await p.getByTestId('tool-brush').click()
  await drag(p, [[480, 300], [600, 300]])
  assert(eq(await pixel(p, 540, 300), BLACK), 'scaled stroke landed in wrong place')
  await p.close()
})

await browser.close()

let failed = 0
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      ${r.err}`}`)
  if (!r.ok) failed++
}
console.log(errors.length ? `\nBrowser errors:\n  ${errors.join('\n  ')}` : '\nNo browser console/page errors.')
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed || errors.length ? 1 : 0)
