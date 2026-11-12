// Saved decisions reopen from the API's stored state and never run the board again (the fixture fails any test that
// posts to /run_sse).
import { randomUUID } from 'node:crypto'
import { expectNoOverflow } from './checks'
import { expect, OWNER, test } from './fixtures'
import { finalState } from './replayState'

test('an unknown decision shows "Decision not found"', async ({ page, api }) => {
  const id = randomUUID()
  await page.goto(`/?decision=${id}`)
  await expect(page.getByText('Decision not found')).toBeVisible()
  expect(api.requests).toContain(`GET /apps/crucible/users/${OWNER}/sessions/${id}`)
  await expectNoOverflow(page)
})

test('a saved decision reopens with its signed call', async ({ page, api }) => {
  const id = randomUUID()
  api.sessions.set(id, {
    ...finalState('dental-ai-receptionist'),
    ratification: { action: 'accept', note: '', at: '2026-11-10T12:00:00.000Z' },
  })

  for (const visit of ['open', 'reload']) {
    if (visit === 'open') await page.goto(`/?decision=${id}`)
    else await page.reload()
    const main = page.locator('main#board-main')
    await expect(page.locator('.viewbar')).toBeVisible()
    await expect(main).toHaveAttribute('data-view', 'brief')
    await expect(page.getByRole('button', { name: 'Decision brief' })).toHaveAttribute('aria-pressed', 'true')
    const call = page.locator('#your-call')
    await expect(call.locator('.hallmark-mark--owner')).toHaveText(/accepted/i)
    await expect(call).toContainText('Not cleared to proceed yet')
    expect(new URL(page.url()).search).toBe(`?decision=${id}`)
  }
  expect(api.requests.filter((r) => r.includes(`/sessions/${id}`))).toEqual(Array(2).fill(`GET /apps/crucible/users/${OWNER}/sessions/${id}`))
})
