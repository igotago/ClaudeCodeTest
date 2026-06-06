'use strict';
const { test, expect } = require('@playwright/test');

test.describe('Gunfire (Shooter)', () => {
  test('loads canvas without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/shooter.html');
    await expect(page.locator('canvas#c')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('canvas has correct dimensions', async ({ page }) => {
    await page.goto('/shooter.html');
    const dims = await page.locator('canvas#c').evaluate(el => ({
      width: el.width,
      height: el.height,
    }));
    expect(dims.width).toBe(900);
    expect(dims.height).toBe(600);
  });
});
