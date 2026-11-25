import type { Locator } from '@playwright/test';

import { expect, test } from '../fixtures/test.js';

function visibleOptionCodes(cell: Locator): Promise<string[]> {
  return cell.locator('.shift-picker button:visible').evaluateAll(buttons =>
    buttons.map(button => button.getAttribute('data-code') ?? 'Üres'),
  );
}

test('BR-025 orders picker options by color, hours and code in every cell', async ({ calendar, testData }) => {
  const first = await testData.createEmployee();
  const second = await testData.createEmployee();
  const laterCode = await testData.createShift(10, { codePrefix: 'Z' });
  const lateStandby = await testData.createShift(8, { standby: true, night: true });
  const earlierCode = await testData.createShift(10, { codePrefix: 'A' });
  const shortNight = await testData.createShift(4, { night: true });
  const shortDay = await testData.createShift(6);
  const shortStandby = await testData.createShift(6, { standby: true });
  const shortStandbyNight = await testData.createShift(4, { standby: true, night: true });

  await calendar.open(2026, 11);

  // The default catalog supplies A (normal), B (night), C (standby), - and SZ.
  const normalOrder = ['Üres', shortDay, earlierCode, laterCode, 'A', shortNight, 'B', '-', 'SZ'];
  const standbyOrder = ['Üres', shortStandby, 'C', shortStandbyNight, lateStandby];

  for (const [employee, date] of [[first, '2026-11-04'], [second, '2026-11-05']] as const) {
    const normalCell = calendar.cell(employee.id, date, 'NORMAL');
    await calendar.openPicker(normalCell);
    expect(await visibleOptionCodes(normalCell)).toEqual(normalOrder);
    await calendar.closePicker(normalCell);

    const standbyCell = calendar.cell(employee.id, date, 'STANDBY');
    await calendar.openPicker(standbyCell);
    expect(await visibleOptionCodes(standbyCell)).toEqual(standbyOrder);
    await calendar.closePicker(standbyCell);
  }
});
