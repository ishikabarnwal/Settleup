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
  await expect(menu.getByRole('link')).toHaveText(['How it works', 'What it does', 'Why SettleUp', 'Log in'])

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

test('the hero has small info cards that describe the product card beside it', async ({ page, isMobile }) => {
  await page.goto('/')
  const cards = page.getByRole('list', { name: 'At a glance' }).getByRole('listitem')
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(0)).toContainText('2 payments settle this trip')
  await expect(cards.nth(0)).toContainText('Meera pays Aarav, Kabir pays Aarav')
  await expect(cards.nth(1)).toContainText('33.34 + 33.33 + 33.33')
  await expect(cards.nth(2)).toContainText('Balances add up to ₹0.00')

  // Floating or stacked, a card must never sit on top of the numbers it's describing.
  const figures = ['gets back ₹2,450.00', 'Meera Iyer', 'Kabir Rao'].map((text) => page.getByText(text).first())
  for (const figure of figures) {
    const f = (await figure.boundingBox())!
    for (let i = 0; i < 3; i++) {
      const c = (await cards.nth(i).boundingBox())!
      const overlaps = f.x < c.x + c.width && c.x < f.x + f.width && f.y < c.y + c.height && c.y < f.y + f.height
      expect(overlaps, `card ${i + 1} covers "${await figure.textContent()}"${isMobile ? ' on a phone' : ''}`).toBe(false)
    }
  }
})

test('the hero keeps one strong action, in the colour that reads on ink', async ({ page }) => {
  await page.goto('/')
  const hero = page.getByRole('region', { name: /Split shared costs/ })
  const getStarted = hero.getByRole('link', { name: 'Get started' })
  // Apricot (243, 159, 90): plum would all but disappear on the dark hero.
  await expect(getStarted).toHaveCSS('background-color', 'rgb(243, 159, 90)')
  await getStarted.click()
  await expect(page).toHaveURL('/register')
})

test('How it works is a connected flow of four steps', async ({ page, isMobile }) => {
  await page.goto('/')
  const flow = page.getByRole('list', { name: 'How it works' })
  const steps = flow.getByRole('listitem')
  await expect(steps).toHaveCount(4)
  await expect(steps.getByRole('heading')).toHaveText([
    'Create a group',
    'Add expenses',
    'SettleUp works out balances',
    'Settle up in fewer payments',
  ])
  await flow.scrollIntoViewIfNeeded()

  // Each connector has to actually join a node to the next one: across on
  // wide screens, down on phones.
  const nodes = await Promise.all([0, 1, 2, 3].map((i) => steps.nth(i).locator('> div').first().boundingBox()))
  const connectors = flow.locator('[data-connector] > div:visible')
  await expect(connectors).toHaveCount(3)

  for (let i = 0; i < 3; i++) {
    const line = (await connectors.nth(i).boundingBox())!
    const here = nodes[i]!
    const next = nodes[i + 1]!
    if (isMobile) {
      expect(line.height, 'runs down').toBeGreaterThan(line.width)
      expect(line.y).toBeGreaterThanOrEqual(here.y + here.height - 1)
      expect(line.y + line.height).toBeLessThanOrEqual(next.y + 1)
    } else {
      expect(Math.abs(here.y - next.y), 'nodes sit on one line').toBeLessThan(1)
      expect(line.x).toBeGreaterThanOrEqual(here.x + here.width - 1)
      expect(line.x + line.width).toBeLessThanOrEqual(next.x + 1)
    }
  }
})

test('the nav links to How it works', async ({ page, isMobile }) => {
  await page.goto('/')
  const header = page.getByRole('banner')
  if (isMobile) {
    await header.getByRole('button', { name: 'Menu' }).click()
    await header.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'How it works' }).click()
  } else {
    await header.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'How it works' }).click()
  }
  await expect(page).toHaveURL(/#how$/)
  await expect(page.getByRole('heading', { name: /From the first receipt to all square/ })).toBeInViewport()
})
