import { test, expect } from '@playwright/test'

async function userLogin (page) {
  await page.getByLabel('User').fill('user1')
  await page.getByLabel('Password').fill('0')
  await page.locator('#login').click()
}

async function adminLogin (page) {
  await page.getByLabel('User').fill('admin')
  await page.getByLabel('Password').fill('0')
  await page.locator('#login').click()
}

test('Check login title', async ({ page }) => {
  await page.goto('/')

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/PassWeaver/)
})

test('Login as user', async ({ page }) => {
  await page.goto('/')
  await userLogin(page)

  const pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_items')
})

test('Login as admin', async ({ page }) => {
  await page.goto('/')
  await adminLogin(page)

  const pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_folders')
})

test('Navigate user menu', async ({ page }) => {
  await page.goto('/')
  await userLogin(page)

  let menu
  let pagetitle

  // Items
  menu = await page.locator('[pageid=items]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_items')

  // Search
  menu = await page.locator('[pageid=search]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_search')

  // Generator
  menu = await page.locator('[pageid=generate]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_generate')

  // Onetime secret
  menu = await page.locator('[pageid=onetimesecret]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_onetimesecret')

  // Preferences
  menu = await page.locator('[pageid=preferences]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_preferences')

  // Logout
  menu = await page.locator('[pageid=logout]')
  await menu.click()
  pagetitle = await page.locator('.login-container').getAttribute('id')
  await expect(pagetitle).toBe('page_login')
})

test('Navigate admin menu', async ({ page }) => {
  await page.goto('/')
  await adminLogin(page)

  let menu
  let pagetitle

  // Folders
  menu = await page.locator('[pageid=folders]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_folders')

  // Users
  menu = await page.locator('[pageid=users]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_users')

  // Groups
  menu = await page.locator('[pageid=groups]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_groups')

  // Generator
  menu = await page.locator('[pageid=generate]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_generate')

  // Onetime secret
  menu = await page.locator('[pageid=onetimesecret]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_onetimesecret')

  // Info
  menu = await page.locator('[pageid=info]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_info')

  // Settings
  menu = await page.locator('[pageid=settings]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_settings')

  // Preferences
  menu = await page.locator('[pageid=preferences]')
  await menu.click()
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_preferences')

  // Logout
  menu = await page.locator('[pageid=logout]')
  await menu.click()
  pagetitle = await page.locator('.login-container').getAttribute('id')
  await expect(pagetitle).toBe('page_login')
})
