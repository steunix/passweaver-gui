import { test, expect } from '@playwright/test'

async function userLogin (page) {
  await page.getByLabel('User').fill('user1')
  await page.getByLabel('Password').fill('0')
  await page.locator('#login').click()
}

test('Generate passwords', async ({ page }) => {
  await page.goto('/')
  await userLogin(page)

  // Load page
  const menu = await page.locator('[pageid=generate]')
  await menu.click()

  const pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_generate')

  await page.waitForLoadState('networkidle')

  // Ensure initial values
  const init1 = await page.evaluate(() => document.querySelector('#generatedpassword').value)
  await expect(init1).toHaveLength(15)

  const init2 = await page.evaluate(() => document.querySelector('#generatedpasswordns').value)
  await expect(init2).toHaveLength(15)

  // Generate symbols password
  await page.locator('#generate').click()
  await page.waitForResponse(/api\/generate/)

  const gen1 = await page.evaluate(() => document.querySelector('#generatedpassword').value)
  await expect(gen1).toHaveLength(15)
  await expect(gen1).not.toEqual(init1)

  // Check copy password
  await page.locator('#copypassword').click()
  const clip1 = await page.evaluate(async () => await navigator.clipboard.readText())
  await expect(clip1).toEqual(gen1)

  // Generate no-symbols password
  await page.locator('#generatens').click()
  await page.waitForResponse(/api\/generate/)

  const gen2 = await page.evaluate(() => document.querySelector('#generatedpasswordns').value)
  await expect(gen2).toHaveLength(15)
  await expect(gen2).not.toEqual(init2)

  // Check copy password
  await page.locator('#copypasswordns').click()
  const clip2 = await page.evaluate(async () => await navigator.clipboard.readText())
  await expect(clip2).toEqual(gen2)
})

test('Generate onetime secrets from passwords', async ({ page }) => {
  await page.goto('/')
  await userLogin(page)

  let pagetitle

  // Load page
  const menu = await page.locator('[pageid=generate]')
  await menu.click()

  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_generate')

  await page.waitForLoadState('networkidle')

  const pwd1 = await page.evaluate(() => document.querySelector('#generatedpassword').value)
  await expect(pwd1).toHaveLength(15)

  await page.locator('#onetime').click()

  // Check page has changed
  pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_onetimesecret')

  // Ensure the data is already compiled
  const data = await page.evaluate(() => document.querySelector('#data').value)
  await expect(data).toEqual(pwd1)

  // Ensure the save button is enabled
  const btn = await page.locator('#save')
  await expect(btn).toBeEnabled()
})
