import { DB_FLOOR, GUARD_HZ, SPECTRO_DB_MAX, SPECTRO_DB_MIN } from '../config'
import { binWidth, type Geometry } from '../dsp/spectrum'

/**
 * Canvas drawing for the Lab. The view is zoomed to ±spanHz around the tone, so a hand's echo
 * (a few hundred Hz either side) fills the picture.
 */

export interface View {
  g: Geometry
  carrierHz: number
  spanHz: number
}

function binRange(v: View): { lo: number; hi: number } {
  const w = binWidth(v.g)
  return { lo: Math.round((v.carrierHz - v.spanHz) / w), hi: Math.round((v.carrierHz + v.spanHz) / w) }
}

function norm(db: number | undefined): number {
  const d = db === undefined || !Number.isFinite(db) ? DB_FLOOR : db
  return Math.min(1, Math.max(0, (d - SPECTRO_DB_MIN) / (SPECTRO_DB_MAX - SPECTRO_DB_MIN)))
}

/** Dark navy → teal → near-white. Brightness carries the meaning, so it reads without colour vision too. */
function heat(x: number): string {
  const r = Math.round(10 + 220 * x ** 2)
  const g = Math.round(18 + 230 * x)
  const b = Math.round(28 + 190 * x ** 0.7)
  return `rgb(${r},${g},${b})`
}

/** Line graph of loudness vs frequency, with the tone in the centre and the guard band shaded. */
export function drawSpectrum(ctx: CanvasRenderingContext2D, w: number, h: number, spectrum: Float32Array, v: View): void {
  const { lo, hi } = binRange(v)
  ctx.fillStyle = '#0b1216'
  ctx.fillRect(0, 0, w, h)

  const guardPx = (GUARD_HZ / v.spanHz) * (w / 2)
  ctx.fillStyle = 'rgba(127,224,200,0.08)'
  ctx.fillRect(w / 2 - guardPx, 0, guardPx * 2, h)
  ctx.strokeStyle = 'rgba(232,241,242,0.25)'
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w / 2, h)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.strokeStyle = '#7fe0c8'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let b = lo; b <= hi; b++) {
    const x = ((b - lo) / (hi - lo)) * w
    const y = h - norm(spectrum[b]) * h
    if (b === lo) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}

/**
 * Scrolling spectrogram: time runs left→right, frequency bottom→top (tone in the middle).
 * Each frame shifts the picture left and paints one new column on the right.
 */
export function pushSpectrogramColumn(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  spectrum: Float32Array,
  v: View,
  colPx: number,
): void {
  const { lo, hi } = binRange(v)
  ctx.drawImage(ctx.canvas, colPx, 0, ctx.canvas.width - colPx, ctx.canvas.height, 0, 0, w - colPx, h)
  const rows = hi - lo + 1
  const rowH = h / rows
  for (let b = lo; b <= hi; b++) {
    ctx.fillStyle = heat(norm(spectrum[b]))
    ctx.fillRect(w - colPx, h - (b - lo + 1) * rowH, colPx, rowH + 0.5)
  }
}
