import { expect, test } from '../fixtures/test.js';

test('BR-017 loads the monthly calendar', async ({ calendar }) => {
  await calendar.open(2026, 11);

  await expect(calendar.table).toBeVisible();
  await expect(calendar.monthPicker).toHaveText(/2026 november/i);
});

test('BR-017 navigates both directions across the year boundary', async ({ calendar, page }) => {
  await calendar.open(2026, 12);

  await calendar.nextMonth();
  await expect(page).toHaveURL(/\?year=2027&month=1$/);
  await expect(calendar.monthPicker).toHaveText(/2027 január/i);

  await calendar.previousMonth();
  await expect(page).toHaveURL(/\?year=2026&month=12$/);
  await expect(calendar.monthPicker).toHaveText(/2026 december/i);
});

test('BR-023 applies and remembers the colorful theme', async ({ calendar, page }) => {
  await calendar.open(2026, 11);

  await expect(calendar.themeToggle).toHaveAttribute('aria-pressed', 'false');
  await calendar.themeToggle.click();
  await expect(calendar.themeToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toHaveClass(/\btheme-colorful\b/);

  await page.reload();
  await expect(calendar.themeToggle).toHaveAttribute('aria-pressed', 'true');

  await calendar.themeToggle.click();
  await expect(calendar.themeToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('body')).not.toHaveClass(/\btheme-colorful\b/);
});

test('BR-023 selects and remembers the colorful palette across pages', async ({ calendar, page }) => {
  await calendar.open(2026, 11);
  const palette = page.getByRole('combobox', { name: 'Színes téma palettája' });
  await expect(palette).toBeHidden();

  await calendar.themeToggle.click();
  await expect(palette).toHaveValue('rainbow');
  await expect(palette.getByRole('option')).toHaveCount(6);
  await palette.selectOption('forest');
  await expect(page.locator('.schedule-page')).toHaveCSS('border-top-color', 'rgba(149, 240, 190, 0.35)');

  await page.reload();
  await expect(palette).toHaveValue('forest');
  await calendar.themeToggle.click();
  await expect(palette).toBeHidden();
  await calendar.themeToggle.click();
  await expect(palette).toHaveValue('forest');

  await page.getByRole('link', { name: 'Dolgozók kezelése' }).click();
  await expect(page.locator('.manage-header')).toHaveCSS('border-top-color', 'rgba(149, 240, 190, 0.18)');

  await page.setViewportSize({ width: 320, height: 700 });
  await calendar.open(2026, 11);
  await expect(palette).toBeInViewport({ ratio: 1 });
  await palette.selectOption('amber');
  await expect(page.locator('.schedule-page')).toHaveCSS('border-top-color', 'rgba(255, 220, 151, 0.35)');
});
