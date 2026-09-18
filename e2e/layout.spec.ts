import { expect, test, type Page } from '@playwright/test'
import { addExpenseViaApi, addMemberViaApi, createGroupViaApi, registerViaApi, settleViaApi, useSession } from './helpers'

/**
 * A page wider than the screen lets phones pan sideways, and on the group page
 * that once dragged the add-expense sheet half off screen. Long names and
 * descriptions are what used to trigger it.
 */
async function expectNoSidewaysScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth, 'page is wider than the screen').toBeLessThanOrEqual(clientWidth)
}

test('no page is wider than the screen, even with long names', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika Barnwal Chatterjee')
  const riya = await registerViaApi(page, 'Riya Sengupta Venkataraman')
  const group = await createGroupViaApi(page, ishika, 'Goa trip with the whole extended family', 'December, 4 nights in Anjuna')
  await addMemberViaApi(page, ishika, group.id, riya)
  await addExpenseViaApi(page, ishika, group.id, {
    description: 'Villa in Anjuna with the pool and the long driveway',
    amount: 123456.78,
    paidBy: ishika.user.id,
    splitType: 'EQUAL',
  })
  await settleViaApi(page, riya, group.id, { paidBy: riya.user.id, paidTo: ishika.user.id, amount: 1000, note: 'UPI' })
  await useSession(page, ishika)

  await page.goto('/')
  await expect(page.getByRole('link', { name: /Goa trip/ })).toBeVisible()
  await expectNoSidewaysScroll(page)

  for (const tab of ['', '?tab=balances', '?tab=settle']) {
    await page.goto(`/groups/${group.id}${tab}`)
    await expect(page.getByRole('tabpanel')).not.toContainText('Loading')
    await page.waitForLoadState('networkidle')
    await expectNoSidewaysScroll(page)
  }

  await page.goto(`/groups/${group.id}`)
  await page.getByRole('button', { name: 'Add expense' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add an expense' })
  await dialog.getByRole('radio', { name: 'By %' }).click()
  await dialog.getByLabel('Percent for Riya').fill('20')
  await expectNoSidewaysScroll(page)

  // The save button must stay on screen and clickable.
  await dialog.getByLabel('Description').fill('Parasailing')
  await dialog.getByLabel('Total').fill('4500')
  await dialog.getByLabel('Percent for Ishika').fill('80')
  await dialog.getByRole('button', { name: 'Add expense' }).click()
  await expect(dialog).toBeHidden()
})
