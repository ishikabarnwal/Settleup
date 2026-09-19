import { expect, test, type Page } from '@playwright/test'
import { registerViaApi, useSession } from './helpers'

const heroHeading = (page: Page) => page.getByRole('heading', { level: 1, name: /Split shared costs/ })

test('visitors see what SettleUp is before being asked to sign up', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Split shared expenses · SettleUp')
  await expect(heroHeading(page)).toBeVisible()

  const features = page.getByRole('region', { name: 'Everything a shared tab needs, nothing it doesn\'t' })
  await expect(features.getByRole('listitem')).toHaveCount(4)
  for (const title of ['Groups for anything', 'Split it your way', 'See where you stand', 'Settle in fewer payments']) {
    await expect(features.getByRole('heading', { name: title })).toBeVisible()
  }

  const why = page.getByRole('region', { name: 'Built around getting the money right' })
  for (const point of ['Exact to the paisa', 'Fewer payments, honestly', 'Balances that always add up', 'No double entries']) {
    await expect(why.getByText(point, { exact: true })).toBeVisible()
  }

  const footer = page.getByRole('contentinfo')
  await expect(footer).toContainText(`© ${new Date().getFullYear()} SettleUp`)
  await expect(footer.getByRole('link', { name: 'Source code' })).toHaveAttribute(
    'href',
    'https://github.com/ishikabarnwal/settleup-frontend',
  )
})

test('Get started leads to sign up, and the header buttons go where they say', async ({ page, isMobile }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Get started' }).first().click()
  await expect(page).toHaveURL('/register')
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()

  // The logo on the sign-up page leads back home.
  await page.getByRole('link', { name: 'SettleUp home' }).click()
  await expect(heroHeading(page)).toBeVisible()

  // On phones Log in lives in the menu; there's no room for it in the pill.
  const header = page.getByRole('banner')
  if (isMobile) {
    await header.getByRole('button', { name: 'Menu' }).click()
    await header.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Log in' }).click()
  } else {
    await header.getByRole('link', { name: 'Log in' }).click()
  }
  await expect(page).toHaveURL('/login')

  await page.goto('/')
  await header.getByRole('link', { name: 'Sign up' }).click()
  await expect(page).toHaveURL('/register')
})

test('the section links scroll to their sections', async ({ page, isMobile }) => {
  await page.goto('/')

  // On phones the header's section links fold into a menu (tested below); the footer has them too.
  const links = isMobile ? page.getByRole('navigation', { name: 'Footer' }) : page.getByRole('navigation', { name: 'Sections' })
  if (isMobile) await expect(page.getByRole('navigation', { name: 'Sections' })).toBeHidden()

  await links.getByRole('link', { name: 'Why SettleUp' }).click()
  await expect(page).toHaveURL(/#why$/)
  await expect(page.getByRole('heading', { name: 'Built around getting the money right' })).toBeInViewport()

  await links.getByRole('link', { name: 'What it does' }).click()
  await expect(page).toHaveURL(/#features$/)
  const featuresHeading = page.getByRole('heading', { name: "Everything a shared tab needs, nothing it doesn't" })
  await expect(featuresHeading).toBeInViewport()

  // The sticky header mustn't sit on top of the section heading it scrolled to.
  const headerBottom = (await page.getByRole('banner').boundingBox())!.height
  await expect.poll(async () => (await featuresHeading.boundingBox())!.y).toBeGreaterThan(headerBottom)
})

test('the header stays put while scrolling', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('contentinfo').scrollIntoViewIfNeeded()
  await expect(page.getByRole('banner')).toBeInViewport()
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign up' })).toBeVisible()
})

test('signed-in users go straight to their dashboard', async ({ page }) => {
  const ishika = await registerViaApi(page, 'Ishika')
  await useSession(page, ishika)

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your groups' })).toBeVisible()
  await expect(page).toHaveTitle('Your groups · SettleUp')
  await expect(heroHeading(page)).toHaveCount(0)
})

test('the landing page fits a phone screen', async ({ page }) => {
  await page.goto('/')
  await expect(heroHeading(page)).toBeVisible()
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
})

test('the nav floats inside the page margins rather than spanning the window', async ({ page }) => {
  await page.goto('/')
  const pill = page.getByRole('banner').locator('div.rounded-full').first()
  const box = (await pill.boundingBox())!
  const width = page.viewportSize()!.width
  expect(box.x).toBeGreaterThanOrEqual(16)
  expect(width - (box.x + box.width)).toBeGreaterThanOrEqual(16)
  expect(box.y).toBeGreaterThanOrEqual(8)
})

test('on phones the section links fold into a menu', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The menu button only exists on small screens')
  await page.goto('/')
  const header = page.getByRole('banner')
  const toggle = header.getByRole('button', { name: 'Menu' })

  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  // With the menu closed, Log in shouldn't also be squeezed into the pill.
  await expect(header.getByRole('link', { name: 'Log in' })).toBeHidden()
  await toggle.click()
  await expect(header.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
  const menu = header.getByRole('navigation', { name: 'Menu' })
  await expect(menu.getByRole('link')).toHaveText(['What it does', 'Why SettleUp', 'Log in'])

  // Escape closes it, and so does picking a section.
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()

  await toggle.click()
  await menu.getByRole('link', { name: 'Why SettleUp' }).click()
  await expect(menu).toBeHidden()
  await expect(page).toHaveURL(/#why$/)
  await expect(page.getByRole('heading', { name: 'Built around getting the money right' })).toBeInViewport()

  // So does a tap somewhere else on the page.
  await toggle.click()
  await expect(menu).toBeVisible()
  await page.getByRole('heading', { name: 'Built around getting the money right' }).click()
  await expect(menu).toBeHidden()
})
