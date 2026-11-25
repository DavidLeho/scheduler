import { expect, test } from '../fixtures/test.js';

test('BR-002 creates an employee with a vacation allocation', async ({ management, testData }) => {
  const name = testData.employeeName();

  await management.open();
  await management.createEmployee(name, 32);

  const employee = management.employee(name);
  await expect(employee).toBeVisible();
  await expect(employee.locator('summary')).toContainText('32');
});
