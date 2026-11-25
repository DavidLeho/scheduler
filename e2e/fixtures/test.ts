import { randomUUID } from 'node:crypto';

import { test as base, type APIRequestContext, type Locator } from '@playwright/test';

import { CalendarPage } from '../pages/calendar-page.js';
import { ManagementPage } from '../pages/management-page.js';

type RecordKind = 'employee' | 'shift';
const paths = {
  employee: '/employees',
  shift: '/shift-types',
} satisfies Record<RecordKind, string>;

class TestData {
  private readonly names: Record<RecordKind, string[]> = { employee: [], shift: [] };

  constructor(
    private readonly request: APIRequestContext,
    private readonly management: ManagementPage,
  ) {}

  // Track the name before the write, including writes exercised by the test UI.
  employeeName(): string {
    const name = `E2E Employee ${randomUUID()}`;
    this.names.employee.push(name);
    return name;
  }

  async createEmployee(): Promise<{ id: string; name: string }> {
    const name = this.employeeName();
    await this.post('/employees', { name, vacationHours: '32' });
    await this.management.open();
    const id = await this.management.recordId(this.management.employee(name), '/employees/update');
    return { id, name };
  }

  async createShift(
    hours: number,
    { standby = false, night = false, codePrefix = 'E' } = {},
  ): Promise<string> {
    const code = `${codePrefix}${randomUUID().slice(0, 8).toUpperCase()}`;
    this.names.shift.push(code);
    const form = {
      code,
      hours: String(hours),
      ...(standby ? { standby: 'on' } : {}),
      ...(night ? { night: 'on' } : {}),
    };
    await this.post('/shift-types', form);
    await this.management.open();
    await this.management.shift(code).waitFor({ state: 'visible' });
    return code;
  }

  async cleanUp(): Promise<void> {
    const errors: unknown[] = [];
    // Employee deletion also clears assignments, which can block shift type deletion.
    for (const kind of ['employee', 'shift'] as const) {
      for (const name of this.names[kind]) {
        try {
          await this.deleteIfPresent(kind, name);
        } catch (error) {
          errors.push(new Error(`Failed to clean up test ${kind} ${name}`, { cause: error }));
        }
      }
    }

    if (errors.length) throw new AggregateError(errors, 'Scheduler test-data cleanup failed');
  }

  private async deleteIfPresent(kind: RecordKind, name: string): Promise<void> {
    await this.management.open();
    const card: Locator = kind === 'employee' ? this.management.employee(name) : this.management.shift(name);
    if (await card.count() === 0) return;

    const path = paths[kind];
    const id = await this.management.recordId(card, `${path}/update`);
    await this.post(`${path}/delete`, { id });
    await this.management.open();
    if (await card.count() !== 0) throw new Error('The record still exists after deletion.');
  }

  private async post(path: string, fields: Record<string, string>): Promise<void> {
    const response = await this.request.post(path, {
      form: { year: '2026', month: '11', ...fields },
      maxRedirects: 0,
    });
    try {
      if (response.status() !== 302) {
        throw new Error(`${path} returned HTTP ${response.status()} instead of redirecting to management.`);
      }
    } finally {
      await response.dispose();
    }
  }
}

type Fixtures = {
  calendar: CalendarPage;
  management: ManagementPage;
  testData: TestData;
};

export const test = base.extend<Fixtures>({
  calendar: async ({ page }, use) => {
    await use(new CalendarPage(page));
  },
  management: async ({ page }, use) => {
    await use(new ManagementPage(page));
  },
  testData: async ({ context, request }, use) => {
    const setupPage = await context.newPage();
    const data = new TestData(request, new ManagementPage(setupPage));
    try {
      await use(data);
    } finally {
      try {
        await data.cleanUp();
      } finally {
        await setupPage.close();
      }
    }
  },
});

export { expect } from '@playwright/test';
