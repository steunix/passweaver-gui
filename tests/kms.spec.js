import { test, expect } from '@playwright/test'

async function adminLogin (page) {
  await page.getByLabel('User').fill('admin')
  await page.getByLabel('Password').fill('0')
  await page.locator('#login').click()
}

test('KMS: create new kms', async ({ page }) => {
  await page.goto('/')
  await adminLogin(page)

  // Generate a random KMS description
  const randomDescription = `KMS-${Math.random().toString(36)}`

  // Navigate to KMS page
  const menu = await page.locator('[pageid=kms]')
  await menu.click()
  const pagetitle = await page.locator('.page-container').getAttribute('id')
  await expect(pagetitle).toBe('page_kms')

  // Click new KMS button
  const newKMSBtn = await page.locator('#itemnew')
  await expect(newKMSBtn).toBeVisible()
  await newKMSBtn.click()

  // Fill in KMS name
  const KMSNameInput = await page.locator('#kmsdescription')
  await expect(KMSNameInput).toBeVisible()
  await KMSNameInput.pressSequentially(randomDescription)

  // Select KMS type (mandatory)
  const typeSelect = await page.locator('#kmstype')
  await expect(typeSelect).toBeVisible()

  // Fill in configuration with empty JSON
  const configInput = await page.getByLabel('Config JSON')
  await expect(configInput).toBeVisible()
  await configInput.pressSequentially('{}')

  // Select the first non-empty option (assuming the first is a placeholder)
  await page.locator('sl-popup svg').click()
  const options = await typeSelect.locator('sl-option').all()
  let selected = false
  for (const option of options) {
    const value = await option.getAttribute('value')
    if (value && value !== '') {
      await option.click()
      selected = true
      break
    }
  }
  await expect(selected).toBe(true)

  // Save
  const saveBtn = await page.locator('#kmssave')
  await expect(saveBtn).toBeEnabled()
  await saveBtn.click()

  // Wait for KMS to appear in list
  await page.waitForTimeout(100)
  await page.waitForSelector('#itemstable tbody td')
  const KMSList = await page.locator('#itemstable tbody td')
  const KMSNames = await KMSList.allInnerTexts()
  await expect(KMSNames).toContain(randomDescription)
})
