/// <reference types="vitest/config" />
import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Build stamp shown on screen, so a tester can confirm the phone is running the latest build.
function buildSha(): string {
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA
  if (fromVercel) return fromVercel.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: true,
    // The phone reaches the laptop through a Cloudflare quick tunnel (HTTPS is required for the mic).
    allowedHosts: ['.trycloudflare.com'],
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
