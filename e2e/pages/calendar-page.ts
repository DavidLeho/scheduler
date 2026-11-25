import { expect, type Locator, type Page, type Response } from '@playwright/test';

export type AssignmentLayer = 'NORMAL' | 'STANDBY';

export class CalendarPage {
  constructor(private readonly page: Page) {}

  async open(year: number, month: number): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(response => this.isAssignmentResponse(response, 'GET') && response.ok()),
      this.page.goto(`/?year=${year}&month=${month}`),
    ]);
  }

  get table(): Locator {
    return this.page.getByRole('table');
  }

  get monthPicker(): Locator {
    return this.page.locator('#monthPickerButton');
  }

  get themeToggle(): Locator {
    return this.page.getByRole('button', { name: 'Színes nézet kapcsoló' });
  }

  previousMonth(): Promise<void> {
    return this.page.getByRole('link', { name: /Előző hónap/ }).click();
  }

  nextMonth(): Promise<void> {
    return this.page.getByRole('link', { name: /Következő hónap/ }).click();
  }

  cell(employeeId: string, date: string, layer: AssignmentLayer): Locator {
    return this.table.locator(
      `[data-employee-id="${employeeId}"][data-date="${date}"][data-assignment-layer="${layer}"]`,
    );
  }

  async assign(cell: Locator, shiftCode: string): Promise<Response> {
    await this.openPicker(cell);
    const [response] = await Promise.all([
      this.page.waitForResponse(result => this.isAssignmentResponse(result, 'POST')),
      cell.locator(`button[data-code="${shiftCode}"]`).click(),
    ]);
    return response;
  }

  async clear(cell: Locator): Promise<Response> {
    await this.openPicker(cell);
    const [response] = await Promise.all([
      this.page.waitForResponse(result => this.isAssignmentResponse(result, 'DELETE')),
      cell.getByRole('button', { name: 'Üres', exact: true }).click(),
    ]);
    return response;
  }

  private async openPicker(cell: Locator): Promise<void> {
    await cell.locator('button.schedule-cell-display').click();
    await expect(cell.getByRole('button', { name: 'Üres', exact: true })).toBeVisible();
  }

  private isAssignmentResponse(response: Response, method: string): boolean {
    return response.request().method() === method && new URL(response.url()).pathname === '/assignments';
  }
}
