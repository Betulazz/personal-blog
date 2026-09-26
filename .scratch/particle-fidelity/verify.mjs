import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '../../frontend/node_modules/playwright/index.mjs'

const destination = new URL('.', import.meta.url).pathname.replace(/^\/(\w):\//, '$1:/')
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text())
})
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' })
await page.locator('canvas.firefly-layer').waitFor()
const canvas = page.locator('canvas.firefly-layer')
const count = Number(await canvas.getAttribute('data-firefly-count'))
const frame = () => canvas.evaluate((element) => element.toDataURL())
const first = await frame()
await page.waitForTimeout(500)
const second = await frame()
await page.evaluate(() => document.documentElement.setAttribute('data-page-hidden', ''))
await page.waitForTimeout(100)
const pausedFirst = await frame()
await page.waitForTimeout(300)
const pausedSecond = await frame()
await page.evaluate(() => document.documentElement.removeAttribute('data-page-hidden'))
await page.waitForTimeout(500)
const resumed = await frame()
await page.emulateMedia({ reducedMotion: 'reduce' })
await canvas.waitFor({ state: 'detached' })
const reducedMotionCount = await canvas.count()
await page.emulateMedia({ reducedMotion: 'no-preference' })
await canvas.waitFor()
await page.getByRole('link', { name: '开始阅读' }).click()
await page.waitForURL(/\/posts/)
const interactionUrl = page.url()
await page.setViewportSize({ width: 430, height: 932 })
await page.waitForTimeout(200)
const mobileCount = await canvas.count()
const report = {
  title: await page.title(),
  count,
  animated: first !== second,
  paused: pausedFirst === pausedSecond,
  resumed: pausedSecond !== resumed,
  reducedMotionCount,
  mobileCount,
  interactionUrl,
  errors,
}
await writeFile(join(destination, 'verification.json'), JSON.stringify(report, null, 2))
console.log(report)
await browser.close()
if (count !== 50 || !report.animated || !report.paused || !report.resumed || reducedMotionCount !== 0 || mobileCount !== 0 || errors.length) process.exitCode = 1
