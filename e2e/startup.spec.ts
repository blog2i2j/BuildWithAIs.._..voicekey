import { test, expect } from '@playwright/test'
import { ElectronTestApp } from './helpers/electron'

test.describe('App Startup', () => {
  let app: ElectronTestApp

  test.beforeEach(async () => {
    app = new ElectronTestApp()
    const page = await app.launch()
    // Navigate to /home to ensure UI is rendered (default is invisible AudioRecorder)
    await page.evaluate(() => {
      window.location.hash = '/home'
    })
  })

  test.afterEach(async () => {
    await app.close()
  })

  test('app launches and shows main window', async () => {
    const page = app.getPage()

    // Check if the title is correct (assuming default Electron app title or set in main)
    // Note: The actual title might depend on localization or index.html,
    // but usually "Voice Key" is the product name
    const title = await page.title()
    // We explicitly check if title is not empty for now, or match "Voice Key"
    expect(title).toBe('Voice Key')

    // Check if the window is visible
    const isVisible = await page.isVisible('body')
    expect(isVisible).toBe(true)
  })

  test('exposes electronAPI to renderer', async () => {
    const page = app.getPage()

    // Verify context bridge
    const isApiExposed = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return !!(window as any).electronAPI
    })
    expect(isApiExposed).toBe(true)
  })

  test('loads home page content', async () => {
    const page = app.getPage()

    // Wait for the h1 to appear using a locator
    // We use a generic clean locator that doesn't rely on specific text
    // since it might be localized, but we expect an h1
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()

    // Check for some main layout structure
    await expect(page.locator('#root')).toBeVisible()
  })
})
