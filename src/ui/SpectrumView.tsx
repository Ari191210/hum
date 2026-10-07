import { useEffect, useRef } from 'react'
import { monitor } from '../audio/session'
import { FFT_SIZE, VIEW_SPAN_HZ } from '../config'
import { drawSpectrum, pushSpectrogramColumn } from './draw'

/** Sizes a canvas for the screen's pixel density and returns a context in CSS-pixel units. */
function setup(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w, h }
}

/** Live zoomed spectrum + scrolling spectrogram. Draws straight to canvas each frame (no React re-render). */
export function SpectrumView() {
  const lineRef = useRef<HTMLCanvasElement>(null)
  const spectroRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!lineRef.current || !spectroRef.current) return
    const line = setup(lineRef.current)
    const spectro = setup(spectroRef.current)
    if (!line || !spectro) return
    spectro.ctx.fillStyle = '#0b1216'
    spectro.ctx.fillRect(0, 0, spectro.w, spectro.h)
    return monitor.subscribe((f) => {
      const view = { g: { sampleRate: f.sampleRate, fftSize: FFT_SIZE }, carrierHz: f.carrierHz, spanHz: VIEW_SPAN_HZ }
      drawSpectrum(line.ctx, line.w, line.h, f.spectrum, view)
      // drawImage on a scaled canvas works in device pixels; reset transform for the shift, then restore.
      const dpr = window.devicePixelRatio || 1
      spectro.ctx.setTransform(1, 0, 0, 1, 0, 0)
      pushSpectrogramColumn(spectro.ctx, spectro.w * dpr, spectro.h * dpr, f.spectrum, view, Math.max(1, Math.round(2 * dpr)))
      spectro.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    })
  }, [])

  return (
    <figure className="spectrum" aria-label="Live sound picture around the inaudible tone">
      <div className="axis-labels" aria-hidden="true">
        <span>−{VIEW_SPAN_HZ} Hz · away</span>
        <span>tone</span>
        <span>+{VIEW_SPAN_HZ} Hz · toward</span>
      </div>
      <canvas ref={lineRef} className="spectrum-line" />
      <div className="spectro-wrap">
        <canvas ref={spectroRef} className="spectrogram" />
        <div className="spectro-labels" aria-hidden="true">
          <span>+{VIEW_SPAN_HZ} Hz toward</span>
          <span>tone</span>
          <span>−{VIEW_SPAN_HZ} Hz away</span>
        </div>
      </div>
      <figcaption>
        Top: loudness around the tone. Bottom: the last few seconds, newest on the right. A moving hand shows up as a bright
        smear above (toward) or below (away) the tone line.
      </figcaption>
    </figure>
  )
}
