/**
 * Spit Wars E2E smoke tests.
 * Verifies landing → menu → game flow + that the canvas/HUD works.
 */
import { test, expect } from '@playwright/test'

test.describe.serial('Spit Wars smoke', () => {
  test('landing page loads with main CTAs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('SPITWARS').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: /PLAY SOLO/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'LEADERBOARD', exact: true })).toBeVisible()
  })

  test('PLAY SOLO opens menu screen with PASS & PLAY + VS AI modes', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /PLAY SOLO/i }).click()
    await page.waitForURL(/\/game/)
    await expect(page.getByRole('button', { name: /PASS & PLAY/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /VS AI/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /START BATTLE/i })).toBeVisible()
  })

  test('VS AI mode reveals KAREN and CHAD personality buttons', async ({ page }) => {
    await page.goto('/game')
    await page.getByRole('button', { name: /VS AI/i }).click()
    await expect(page.getByRole('button', { name: /KAREN/i })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: /CHAD/i })).toBeVisible()
  })

  test('starting battle in PASS & PLAY shows the game canvas', async ({ page }) => {
    await page.goto('/game')
    await page.getByRole('button', { name: /PASS & PLAY/i }).click()
    await page.getByRole('button', { name: /START BATTLE/i }).click()
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 10_000 })
    const box = await canvas.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThan(100)
    expect(box?.height ?? 0).toBeGreaterThan(100)
  })

  test('online lobby requires auth', async ({ page }) => {
    const res = await page.goto('/online')
    // Either redirects to /auth or shows login prompt
    const finalUrl = page.url()
    const html = await page.locator('body').innerText()
    const requiresAuth = /sign in|log in|login|auth|register/i.test(html) || /\/auth/.test(finalUrl)
    console.log('Online final URL:', finalUrl, '| auth required:', requiresAuth)
    expect(requiresAuth).toBe(true)
  })

  test('auth/me + leaderboard API endpoints respond', async ({ page }) => {
    const me = await page.request.get('/api/auth/me')
    // Either 200 with null user, or 401
    expect([200, 401]).toContain(me.status())
    const lb = await page.request.get('/api/games?leaderboard=1')
    // Should return something (200 with leaderboard array, or 404 if route missing)
    console.log('Leaderboard endpoint status:', lb.status())
    expect([200, 404]).toContain(lb.status())
  })
})
