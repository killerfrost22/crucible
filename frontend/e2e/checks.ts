// Layout and accessibility checks shared by the specs.
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** Fonts change every width, so measure only once they are in. */
export async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

/** The page never scrolls sideways. */
export async function expectNoOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth, 'document wider than the viewport').toBeLessThanOrEqual(clientWidth)
}

/**
 * Text cut off inside `selector`: a rendered element with text that hides its overflow (hidden or clip) while its
 * content is wider than its box. Screen-reader-only text (`.visually-hidden` and the like: a 1px box, clipped to
 * nothing) is hidden on purpose and skipped.
 */
export async function expectNoClippedText(page: Page, selector: string) {
  await expect(page.locator(selector).first()).toBeAttached()
  const clipped = await page.evaluate((selector) => {
    const srOnly = (el: HTMLElement) => {
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (style.clipPath === 'inset(50%)' || style.clip === 'rect(0px, 0px, 0px, 0px)') return true
        if (style.position === 'absolute' && node.offsetWidth <= 1 && node.offsetHeight <= 1) return true
      }
      return false
    }
    const describe = (el: Element) => {
      const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).join('.')}` : ''
      return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}`
    }
    const found: string[] = []
    for (const root of document.querySelectorAll(selector)) {
      for (const el of [root, ...root.querySelectorAll('*')]) {
        if (!(el instanceof HTMLElement)) continue
        if (!el.textContent?.trim() || el.getClientRects().length === 0) continue
        const style = getComputedStyle(el)
        if (!/hidden|clip/.test(style.overflowX)) continue
        if (el.scrollWidth > el.clientWidth + 1 && !srOnly(el)) {
          found.push(`${describe(el)} (${el.scrollWidth} > ${el.clientWidth}): "${el.textContent.trim().slice(0, 60)}"`)
        }
      }
    }
    return found
  }, selector)
  expect(clipped, `clipped text in ${selector}`).toEqual([])
}

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(summary, 'axe WCAG 2.2 A/AA violations').toEqual([])
}
