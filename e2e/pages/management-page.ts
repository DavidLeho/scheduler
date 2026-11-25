import type { Locator, Page } from '@playwright/test';

export class ManagementPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/manage?year=2026&month=11');
  }

  employee(name: string): Locator {
    return this.page.locator('details.employee-details-card').filter({
      has: this.page.locator('summary').getByText(name, { exact: true }),
    });
  }

  shift(code: string): Locator {
    return this.page.locator('details.shift-details-card').filter({
      has: this.page.locator('summary').getByText(code, { exact: true }),
    });
  }

  async createEmployee(name: string, vacationHours: number): Promise<void> {
    const form = this.page.locator('form[action="/employees"]');
    await form.getByRole('textbox', { name: 'Név:' }).fill(name);
    await form.getByRole('spinbutton', { name: 'Szabadság órában:' }).fill(String(vacationHours));
    await form.getByRole('button', { name: 'Dolgozó hozzáadása' }).click();
  }

  recordId(card: Locator, editPath: string): Promise<string> {
    return card.locator(`form[action="${editPath}"] input[name="id"]`).inputValue();
  }
}
