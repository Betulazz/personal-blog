import { expect, test } from '@playwright/test'

const treatments = ['atmospheric', 'plain'] as const
const widths = [375, 430, 768, 1024, 1440, 1920] as const

for (const treatment of treatments) {
  test(`${treatment} background keeps stress content readable and accessible`, async ({
    page,
  }) => {
    const consoleProblems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleProblems.push(`${message.type()}: ${message.text()}`)
      }
    })

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/__acceptance/display-primitives?treatment=${treatment}`)

    await expect(page).toHaveTitle('Display primitives acceptance')
    const stressHeading = page.getByRole('heading', {
      name: /当一段很长的中文标题 meets an equally descriptive English heading/,
    })
    await expect(stressHeading).toBeVisible()
    await expect(
      page.getByRole('img', { name: '文章封面暂不可用' }),
    ).toBeVisible()
    await expect(
      page.getByLabel('文章元数据').getByText('已发布'),
    ).toBeVisible()

    const textPresentation = await stressHeading.evaluate((element) => ({
      color: getComputedStyle(element).color,
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      opacity: getComputedStyle(element).opacity,
    }))
    expect(textPresentation.color).toBe('rgb(242, 245, 255)')
    expect(textPresentation.fontSize).toBeGreaterThanOrEqual(24)
    expect(textPresentation.opacity).toBe('1')
    expect(consoleProblems).toEqual([])
  })
}

test('stress content stays within every required viewport width', async ({
  page,
}) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 430 ? 932 : 900 })
    await page.goto('/__acceptance/display-primitives')

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(dimensions.scrollWidth, `${width}px viewport`).toBeLessThanOrEqual(
      dimensions.clientWidth,
    )
  }
})
