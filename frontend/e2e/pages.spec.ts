// The home page and the technical explainer, at every width in both themes.
import { expectNoAxeViolations, expectNoClippedText, expectNoOverflow, settle } from './checks'
import { expect, test, THEMES, VIEWPORTS } from './fixtures'

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`${viewport.width}px ${theme}`, () => {
      test.use({ viewport, theme })

      test('home', async ({ page }) => {
        await page.goto('/')
        await expect(page.locator('.hm-head')).toBeVisible()
        await expect(page.locator('#how')).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await settle(page)
        await expectNoOverflow(page)
        await expectNoClippedText(page, '.hm-head')
        await expectNoClippedText(page, '#how')
        await expectNoAxeViolations(page)
      })

      test('under the hood', async ({ page }) => {
        await page.goto('/under-the-hood')
        await expect(page.locator('.uth-top')).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        await settle(page)
        await expectNoOverflow(page)
        await expectNoClippedText(page, '.uth-top')
        await expectNoAxeViolations(page)
      })
    })
  }
}
