import type { Response } from '@playwright/test';

import { expect, test } from '../fixtures/test.js';

const novemberDay = '2026-11-04';

async function expectAssignmentResult(response: Response, result: string): Promise<void> {
  expect(response.ok()).toBe(true);
  expect(await response.text()).toBe(result);
}

test('BR-012 assigns a normal shift', async ({ calendar, testData }) => {
  const employee = await testData.createEmployee();
  const shift = await testData.createShift(8);
  await calendar.open(2026, 11);
  const cell = calendar.cell(employee.id, novemberDay, 'NORMAL');

  await expectAssignmentResult(await calendar.assign(cell, shift), 'CREATED');

  await expect(cell).toHaveAttribute('data-shift-code', shift);
  await expect(cell.getByRole('button', { name: '8', exact: true })).toBeVisible();
});

test('BR-012 replaces an existing shift', async ({ calendar, testData }) => {
  const employee = await testData.createEmployee();
  const original = await testData.createShift(8);
  const replacement = await testData.createShift(12);
  await calendar.open(2026, 11);
  const cell = calendar.cell(employee.id, novemberDay, 'NORMAL');
  await expectAssignmentResult(await calendar.assign(cell, original), 'CREATED');
  await expect(cell).toHaveAttribute('data-shift-code', original);

  await expectAssignmentResult(await calendar.assign(cell, replacement), 'UPDATED');

  await expect(cell).toHaveAttribute('data-shift-code', replacement);
  await expect(cell.getByRole('button', { name: '12', exact: true })).toBeVisible();
});

test('BR-013 clears an existing shift', async ({ calendar, testData, page }) => {
  const employee = await testData.createEmployee();
  const shift = await testData.createShift(8);
  await calendar.open(2026, 11);
  const cell = calendar.cell(employee.id, novemberDay, 'NORMAL');
  await expectAssignmentResult(await calendar.assign(cell, shift), 'CREATED');
  await expect(cell).toHaveAttribute('data-shift-code', shift);

  await expectAssignmentResult(await calendar.clear(cell), 'OK');

  await expect(cell).not.toHaveAttribute('data-shift-code', /.+/);
  await expect(cell.getByRole('button', { name: '-', exact: true })).toBeVisible();
  const response = await page.request.get('/assignments');
  expect(response.ok()).toBe(true);
  expect(await response.json()).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ employeeId: Number(employee.id), date: novemberDay }),
  ]));
});

test('BR-012 restores the saved shift after a reload', async ({ calendar, testData, page }) => {
  const employee = await testData.createEmployee();
  const shift = await testData.createShift(12);
  await calendar.open(2026, 11);
  const cell = calendar.cell(employee.id, novemberDay, 'NORMAL');
  await expectAssignmentResult(await calendar.assign(cell, shift), 'CREATED');
  await expect(cell).toHaveAttribute('data-shift-code', shift);

  await page.reload();

  await expect(cell).toHaveAttribute('data-shift-code', shift);
  await expect(cell.getByRole('button', { name: '12', exact: true })).toBeVisible();
});

test('BR-010 and BR-011 keep normal and standby shifts in separate rows', async ({ calendar, testData }) => {
  const employee = await testData.createEmployee();
  const normal = await testData.createShift(8);
  const standby = await testData.createShift(6, { standby: true });
  await calendar.open(2026, 11);
  const normalCell = calendar.cell(employee.id, novemberDay, 'NORMAL');
  const standbyCell = calendar.cell(employee.id, novemberDay, 'STANDBY');

  await expectAssignmentResult(await calendar.assign(normalCell, normal), 'CREATED');
  await expectAssignmentResult(await calendar.assign(standbyCell, standby), 'CREATED');
  await expect(normalCell).toHaveAttribute('data-shift-code', normal);
  await expect(standbyCell).toHaveAttribute('data-shift-code', standby);

  await expectAssignmentResult(await calendar.clear(standbyCell), 'OK');
  await expect(standbyCell).not.toHaveAttribute('data-shift-code', /.+/);
  await expect(normalCell).toHaveAttribute('data-shift-code', normal);
});

test('BR-014 locks and unlocks both rows immediately when a 24-hour shift changes', async ({ calendar, testData }) => {
  const employee = await testData.createEmployee();
  const longShift = await testData.createShift(24);
  const normal = await testData.createShift(8);
  await calendar.open(2026, 11);

  const source = calendar.cell(employee.id, '2026-11-10', 'NORMAL');
  const restCells = ['2026-11-11', '2026-11-12'].flatMap(date =>
    (['NORMAL', 'STANDBY'] as const).map(layer => calendar.cell(employee.id, date, layer)),
  );

  await expectAssignmentResult(await calendar.assign(source, longShift), 'CREATED');
  for (const cell of restCells) {
    const display = cell.locator('button.schedule-cell-display');
    await expect(display).toBeDisabled();
    await expect(display).toHaveCSS('background-color', 'rgb(35, 67, 71)');
    await expect(cell).toHaveAttribute('title', /Kötelező pihenőnap.*2026-11-10/);
  }
  await calendar.themeToggle.click();
  await expect(restCells[0].locator('button.schedule-cell-display')).toHaveCSS('background-color', 'rgb(35, 67, 71)');

  await expectAssignmentResult(await calendar.assign(source, normal), 'UPDATED');
  for (const cell of restCells) {
    await expect(cell.locator('button.schedule-cell-display')).toBeEnabled();
    await expect(cell).not.toHaveAttribute('title', /Kötelező pihenőnap/);
  }

  await expectAssignmentResult(await calendar.assign(source, longShift), 'UPDATED');
  await expect(restCells[3].locator('button.schedule-cell-display')).toBeDisabled();
  await expectAssignmentResult(await calendar.clear(source), 'OK');
  for (const cell of restCells) {
    await expect(cell.locator('button.schedule-cell-display')).toBeEnabled();
  }
});

test('BR-015 reports a second-day conflict across months and preserves both rest markers', async ({ calendar, testData, page }) => {
  const employee = await testData.createEmployee();
  const longShift = await testData.createShift(24);
  const standby = await testData.createShift(6, { standby: true });
  const unavailable = calendar.cell(employee.id, '2026-12-01', 'NORMAL');
  const vacation = calendar.cell(employee.id, '2026-12-02', 'NORMAL');
  const conflicting = calendar.cell(employee.id, '2026-12-02', 'STANDBY');
  const source = calendar.cell(employee.id, '2026-11-30', 'NORMAL');
  const alerts: string[] = [];
  page.on('dialog', async dialog => {
    alerts.push(dialog.message());
    await dialog.accept();
  });

  await calendar.open(2026, 12);
  await expectAssignmentResult(await calendar.assign(unavailable, '-'), 'CREATED');
  await expectAssignmentResult(await calendar.assign(vacation, 'SZ'), 'CREATED');
  await expectAssignmentResult(await calendar.assign(conflicting, standby), 'CREATED');

  await calendar.previousMonth();
  await expectAssignmentResult(await calendar.assign(source, longShift), 'REST_CONFLICT_AFTER_24H|2026-12-02|STANDBY');
  expect(alerts).toEqual([expect.stringMatching(/2026-12-02.*készenléti sorban/)]);
  await expect(source).not.toHaveAttribute('data-shift-code', /.+/);

  await calendar.nextMonth();
  await expect(conflicting).toHaveAttribute('data-shift-code', standby);
  await expectAssignmentResult(await calendar.clear(conflicting), 'OK');
  await calendar.previousMonth();
  await expectAssignmentResult(await calendar.assign(source, longShift), 'CREATED');

  await calendar.nextMonth();
  await expect(unavailable).toHaveAttribute('data-shift-code', '-');
  await expect(vacation).toHaveAttribute('data-shift-code', 'SZ');
  for (const date of ['2026-12-01', '2026-12-02']) {
    for (const layer of ['NORMAL', 'STANDBY'] as const) {
      const cell = calendar.cell(employee.id, date, layer);
      await expect(cell.locator('button.schedule-cell-display')).toBeDisabled();
      await expect(cell).toHaveAttribute('title', /Kötelező pihenőnap.*2026-11-30/);
    }
  }
});

test('BR-014 applies two rest days after a 24-hour standby across the year boundary', async ({ calendar, testData }) => {
  const employee = await testData.createEmployee();
  const longStandby = await testData.createShift(24, { standby: true });
  await calendar.open(2026, 12);

  const source = calendar.cell(employee.id, '2026-12-31', 'STANDBY');
  await expectAssignmentResult(await calendar.assign(source, longStandby), 'CREATED');
  await calendar.nextMonth();

  for (const date of ['2027-01-01', '2027-01-02']) {
    for (const layer of ['NORMAL', 'STANDBY'] as const) {
      await expect(calendar.cell(employee.id, date, layer).locator('button.schedule-cell-display')).toBeDisabled();
    }
  }
  await expect(calendar.cell(employee.id, '2027-01-03', 'NORMAL').locator('button.schedule-cell-display')).toBeEnabled();
});
