import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '../../frontend/node_modules/playwright/index.mjs'

const destination = new URL('.', import.meta.url).pathname.replace(/^\/(\w):\//, '$1:/')
const phase = process.argv[2] ?? 'before'
await mkdir(destination, { recursive: true })

const browser = await chromium.launch({ headless: true })
const report = []
for (const target of [
  { name: phase, url: 'http://127.0.0.1:3000/' },
]) {
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 430, height: 932 },
  ]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'no-preference' })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForTimeout(1800)
    const stem = `${target.name}-${viewport.width}x${viewport.height}`
    await page.screenshot({ path: join(destination, `${stem}-first.png`) })
    await page.waitForTimeout(4000)
    await page.screenshot({ path: join(destination, `${stem}-later.png`) })
    report.push({
      target: stem,
      title: await page.title(),
      url: page.url(),
      fireflies: await page.locator('canvas.firefly-layer').getAttribute('data-firefly-count').catch(() => null),
      referenceFireflies: await page.locator('[style*="fireflyBreathe"]').count(),
      errors,
    })
    await page.close()
  }
}
await writeFile(join(destination, `${phase}-report.json`), JSON.stringify(report, null, 2))
console.log(report)
await browser.close()
