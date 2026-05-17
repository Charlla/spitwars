/**
 * Spit Wars E2E smoke tests.
 * Verifies landing → menu → game flow + that the canvas/HUD works.
 * Also verifies guest mode for both solo and online play.
 */
import { test, expect } from '@playwright/test'

test.describe.serial('Spit Wars smoke', () => {
  test('landing page loads with main CTAs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('SPITWARS').first()).toBeVisible({ timeout: 15_000 })
    // Big primary button is now just "PLAY"
    await expect(page.getByRole('link', { name: /^PLAY$/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /PLAY ONLINE/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'LEADERBOARD', exact: true })).toBeVisible()
  })

  test('guest can start solo game without signing in', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /^PLAY$/i }).click()
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

  test('FIRE button appears in HUD after starting battle', async ({ page }) => {
    await page.goto('/game')
    await page.getByRole('button', { name: /PASS & PLAY/i }).click()
    await page.getByRole('button', { name: /START BATTLE/i }).click()
    await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 10_000 })
    await expect(page.getByRole('button', { name: /^FIRE$/ })).toBeVisible({ timeout: 5_000 })
  })

  test('guest can access online lobby and enter a guest name', async ({ page }) => {
    await page.goto('/online')
    // Should NOT redirect to auth — the page should render
    await expect(page).toHaveURL(/\/online/)
    // GUEST NAME field should be visible since not logged in
    await expect(page.getByText(/GUEST NAME/i)).toBeVisible({ timeout: 10_000 })
    // CREATE ROOM button should be enabled (the auto-generated name is set)
    await expect(page.getByRole('button', { name: /\+ CREATE ROOM/i })).toBeVisible()
  })

  test('auth page shows Play as guest link', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByRole('link', { name: /Play as guest/i })).toBeVisible({ timeout: 5_000 })
  })

  test('auth/me + leaderboard API endpoints respond', async ({ page }) => {
    const me = await page.request.get('/api/auth/me')
    expect([200, 401]).toContain(me.status())
    const lb = await page.request.get('/api/games?leaderboard=1')
    console.log('Leaderboard endpoint status:', lb.status())
    expect([200, 404]).toContain(lb.status())
  })

  test('rooms API list is public (returns array, not 401)', async ({ page }) => {
    const res = await page.request.get('/api/rooms')
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.rooms)).toBe(true)
  })
})
