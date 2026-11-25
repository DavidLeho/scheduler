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

test('BR-014 enforces rest after a 24-hour shift across a month boundary', async ({ calendar, testData, page }) => {
  const employee = await testData.createEmployee();
  const longShift = await testData.createShift(24);
  const normal = await testData.createShift(8);
  const standby = await testData.createShift(6, { standby: true });
  const alerts: string[] = [];
  page.on('dialog', async dialog => {
    alerts.push(dialog.message());
    await dialog.accept();
  });
  await calendar.open(2026, 11);
  const lastDay = calendar.cell(employee.id, '2026-11-30', 'NORMAL');
  await expectAssignmentResult(await calendar.assign(lastDay, longShift), 'CREATED');
  await expect(lastDay).toHaveAttribute('data-shift-code', longShift);
  await calendar.nextMonth();
  await expect(calendar.monthPicker).toHaveText(/2026 december/i);

  const normalCell = calendar.cell(employee.id, '2026-12-01', 'NORMAL');
  const standbyCell = calendar.cell(employee.id, '2026-12-01', 'STANDBY');
  await expectAssignmentResult(await calendar.assign(normalCell, normal), 'PREVIOUS_DAY_24H_REST_REQUIRED');
  await expectAssignmentResult(await calendar.assign(standbyCell, standby), 'PREVIOUS_DAY_24H_REST_REQUIRED');
  expect(alerts).toHaveLength(2);
  for (const message of alerts) expect(message).toContain('24 órás műszak után');
  await expect(normalCell).not.toHaveAttribute('data-shift-code', /.+/);
  await expect(standbyCell).not.toHaveAttribute('data-shift-code', /.+/);

  await expectAssignmentResult(await calendar.assign(normalCell, '-'), 'CREATED');
  await expect(normalCell).toHaveAttribute('data-shift-code', '-');
});
