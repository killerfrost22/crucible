// Each recorded meeting, skipped to its verdict, at every width in both themes.
import { expectNoAxeViolations, expectNoClippedText, expectNoOverflow, settle } from './checks'
import { countRequests, expect, test, THEMES, VIEWPORTS } from './fixtures'
import { REPLAYS } from './replayState'

/** axe is the slow check: a phone and a desktop width cover both layouts of the brief. */
const AXE_WIDTHS = new Set([375, 1440])

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`${viewport.width}px ${theme}`, () => {
      test.use({ viewport, theme })

      for (const name of REPLAYS) {
        test(`replay ${name}`, async ({ page }) => {
          const fetches = countRequests(page, (path) => path === `/replays/${name}.sse`)
          await page.goto(`/?replay=${name}`)
          const skip = page.getByRole('button', { name: /^Skip( to end)?$/ })
          await expect(skip).toBeEnabled()
          await skip.click()

          const main = page.locator('main#board-main')
          await expect(page.locator('.viewbar')).toBeVisible()
          await expect(main).toHaveAttribute('data-view', 'brief')
          await expect(page.locator('#brief-recommendation')).toBeVisible()
          await settle(page)
          await expectNoOverflow(page)
          await expectNoClippedText(page, '.frame')
          await expectNoClippedText(page, '.brief-view')
          await expectNoClippedText(page, '.compare__opt')
          if (AXE_WIDTHS.has(viewport.width)) await expectNoAxeViolations(page)

          // G1: a standings link jumps to that seat's card in the transcript and keeps the verdict; nothing reloads.
          // Phones show no standings (board.css), so there the switch to the transcript is checked on its own.
          const standing = page.locator('.standings a').first()
          const phone = viewport.width < 768
          if (phone || !(await standing.isVisible())) await page.getByRole('button', { name: 'Meeting transcript' }).click()
          let target = '#board-seats'
          if (phone) {
            await expect(standing).toBeHidden()
          } else {
            target = (await standing.getAttribute('href')) ?? ''
            expect(target).toMatch(/^#seat-card-/)
            await standing.click()
            await expect(page).toHaveURL(new RegExp(`${target}$`))
          }
          await expect(main).toHaveAttribute('data-view', 'transcript')
          await expect(main).toHaveAttribute('data-finished', 'true')
          await expect(page.locator(target)).toBeVisible()
          await expect(page.locator('.board__outcome .verdict')).toBeVisible()
          await expect(page.locator('.viewbar')).toBeVisible()
          expect(new URL(page.url()).search).toBe(`?replay=${name}`)
          expect(fetches.count(), 'the recording was fetched again').toBe(1)
          await expectNoOverflow(page)
        })
      }
    })
  }
}

test('an unknown recording shows "Recording not found"', async ({ page }) => {
  await page.goto('/?replay=nope')
  await expect(page.getByText('Recording not found')).toBeVisible()
  await expectNoOverflow(page)
})
