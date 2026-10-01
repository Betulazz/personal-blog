// Run from the repository root. Adds styles only in this temporary browser.
const { createRequire } = require('node:module');
const path = require('node:path');
const os = require('node:os');
const req = createRequire(path.resolve('frontend/package.json'));
const { chromium } = req('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      ignoreHTTPSErrors: true,
      viewport: process.argv.includes('--mobile')
        ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('https://39.107.122.20/posts/testing', { waitUntil: 'networkidle' });
    await page.locator('.comment-item__body h1').first().waitFor();
    if (process.argv.includes('--css-probe')) {
      await page.addStyleTag({ content:
        '.comment-item__body h1{font-size:1.5em;font-weight:700;margin:.8em 0 .4em}' +
        '.comment-item__body h2{font-size:1.25em;font-weight:650;margin:.8em 0 .4em}'
      });
    }
    const metrics = await page.locator('.comment-item__body').first().evaluate(node => ({
      body: getComputedStyle(node).fontSize,
      h1: getComputedStyle(node.querySelector('h1')).fontSize,
      h2: getComputedStyle(node.querySelector('h2')).fontSize,
      weight: getComputedStyle(node.querySelector('h1')).fontWeight,
    }));
    const screenshot = path.join(os.tmpdir(), process.argv.includes('--deployed')
      ? `blog-comments-cloud-after${process.argv.includes('--mobile') ? '-mobile' : ''}.png`
      : process.argv.includes('--css-probe')
        ? 'blog-comment-section-css-probe.png' : 'blog-comment-section-before.png');
    await page.locator('.comment-section').screenshot({ path: screenshot, caret: 'initial' });
    console.log(JSON.stringify({ url: page.url(), title: await page.title(), metrics, errors, screenshot }));
    if (parseFloat(metrics.h1) <= parseFloat(metrics.h2) ||
        parseFloat(metrics.h2) <= parseFloat(metrics.body) || errors.length) {
      console.log('FAIL: comment Markdown heading hierarchy missing');
      process.exitCode = 1;
    } else {
      console.log('PASS: comment Markdown heading hierarchy visible');
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
