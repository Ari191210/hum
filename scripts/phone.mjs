// Fast phone loop for DSP tuning (M1–M2): runs the dev server and a Cloudflare quick tunnel,
// then prints an HTTPS link the phone can open (the mic only works over HTTPS).
// The everyday routine is simpler: open https://hum-switch.vercel.app — every push deploys there.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const PORT = 5173
const CLOUDFLARED = ['C:/Program Files (x86)/cloudflared/cloudflared.exe', 'C:/Program Files/cloudflared/cloudflared.exe'].find(
  existsSync,
) ?? 'cloudflared'

// Spawn Vite with node directly (no shell) so stopping it doesn't leave orphan processes on Windows.
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], { stdio: 'inherit' })
const tunnel = spawn(CLOUDFLARED, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`])

let printed = false
function scan(chunk) {
  const url = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(chunk.toString())?.[0]
  if (url && !printed) {
    printed = true
    console.log(`\n==============================\n PHONE URL: ${url}\n==============================\n`)
  }
}
tunnel.stdout.on('data', scan)
tunnel.stderr.on('data', scan)

function killTree(child) {
  if (child.exitCode !== null || child.pid === undefined) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'])
  else child.kill()
}

function stop() {
  killTree(vite)
  killTree(tunnel)
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
vite.on('exit', stop)
tunnel.on('exit', (code) => {
  console.error(`cloudflared exited (${code}). Use https://hum-switch.vercel.app instead.`)
  stop()
})
