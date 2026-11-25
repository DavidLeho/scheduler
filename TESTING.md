# Testing and QA

The project has nine JUnit Jupiter tests across two classes and fourteen Playwright Chromium tests. Java tests focus on Spring context startup and the assignment write path. Browser tests cover core workflows from the calendar and management pages. See [Business rules](BUSINESS_RULES.md) for rule identifiers and [Architecture](ARCHITECTURE.md) for the HTTP and persistence flow.

## Execution

Run from the repository root, alongside `pom.xml`. Use JDK 21. The wrapper downloads its pinned Maven distribution and resolves dependencies on first use.

| Task | Windows | macOS or Linux |
| --- | --- | --- |
| Full test suite | `.\mvnw.cmd test` | `./mvnw test` |
| Assignment integration tests | `.\mvnw.cmd "-Dtest=AssignmentIntegrationTests" test` | `./mvnw -Dtest=AssignmentIntegrationTests test` |
| One rest-rule test | `.\mvnw.cmd "-Dtest=AssignmentIntegrationTests#protectsBothDaysOfTheNextMonthAndUnlocksAfterShortening" test` | `./mvnw -Dtest=AssignmentIntegrationTests#protectsBothDaysOfTheNextMonthAndUnlocksAfterShortening test` |
| Clean package with tests | `.\mvnw.cmd clean package` | `./mvnw clean package` |

Surefire writes XML and text reports to `target/surefire-reports/`.

## Frameworks, isolation and fixtures

- [pom.xml](pom.xml) declares Spring Boot's Thymeleaf and Web MVC test starters in test scope. JUnit Jupiter executes tests, Spring Boot Test loads the application context, and Spring MVC Test supplies MockMvc. Maven Surefire runs both test classes.
- Both classes use `@SpringBootTest` with `jdbc:h2:mem:scheduler-test` and Hibernate `create-drop`. Hibernate builds the tables and the production SQL initializer adds the unique constraint. The tests exercise neither file-based startup updates nor a developer's persistent database.
- [AssignmentIntegrationTests](src/test/java/com/pufi/scheduler/AssignmentIntegrationTests.java) builds MockMvc from the real web application context. Requests go through binding, the controller, transactions, repositories and H2 without opening a browser or network socket.
- Each test creates its own synthetic employee and shift types. Startup-seeded system shifts supply `-` and `SZ`. Assignment requests commit normally and repositories inspect persisted results. Test isolation depends on per-test employee IDs and the in-memory context lifecycle, so fixtures should avoid assertions against global row counts.

## Existing test inventory and coverage

| Test | Main check | Rule coverage |
| --- | --- | --- |
| `SchedulerApplicationTests.contextLoads` | The Spring application context starts with the isolated datasource and startup initialization. | Indirect exercise of BR-001 and startup SQL. |
| `updatesNormalAssignmentInPlaceAndKeepsStandbySeparate` | Both layers can be saved. Normal replacement preserves its ID and standby values. Deleting standby preserves normal. | BR-011 to BR-013. |
| `rejectsShiftTypesInTheWrongLayer` | Both mismatch directions return the expected text and persist no rows. | BR-010. |
| `protectsBothDaysOfTheNextMonthAndUnlocksAfterShortening` | Both December 1 and 2 reject normal work and standby after a November 30 24-hour shift, while manual rest markers are valid. Shortening the shift allows work again. | BR-014. |
| `rejectsUpdatingToTwentyFourHoursWhenTheNextMonthAlreadyHasWork` | Normal work on day one or standby on day two blocks the save and remains intact. The existing `-` and `SZ` markers are compatible with the update. | BR-012 and BR-015. |
| `appliesToTwentyFourHourStandbyAcrossTheYearAndUnlocksAfterDeletion` | A December 31 standby shift blocks work on January 1 and 2. January 3 is free of that restriction, and deletion removes both blocks. | BR-014. |
| `rejectsPromotingAUsedShiftTypeIfItsAssignmentsWouldCauseAConflict` | A catalog change to 24 hours reports a conflicting date and leaves the current records in place. | BR-009 and BR-015. |
| `leavesAnExistingSecondDayConflictInPlaceUntilExplicitDeletion` | A legacy conflict survives reads and rejected writes. Explicit deletion removes only the selected assignment. | BR-013 and BR-014. |
| `databaseRejectsDuplicateAssignmentsInEitherLayer` | Direct repository inserts raise `DataIntegrityViolationException` for duplicate keys in both layers, and the two original rows remain. | BR-011. |

Sources are [context test](src/test/java/com/pufi/scheduler/SchedulerApplicationTests.java) and [assignment integration tests](src/test/java/com/pufi/scheduler/AssignmentIntegrationTests.java).

## Playwright E2E

### Setup and commands

Use Node.js 24 with npm, JDK 21 and room to install the Playwright-managed Chromium build. From the repository root on Windows:

```powershell
cd e2e
npm.cmd ci
npx.cmd playwright install chromium
```

Run the following commands from `e2e/`. On macOS or Linux, use `npm` and `npx` without the `.cmd` suffix.

| Task | Command |
| --- | --- |
| Full Chromium suite | `npm.cmd test` |
| One spec file | `npm.cmd test -- tests/assignments.spec.ts` |
| One test within a file | `npm.cmd test -- tests/assignments.spec.ts -g "locks and unlocks both rows"` |
| List the selected tests | `npm.cmd test -- --list` |
| Interactive UI Mode | `npm.cmd run test:ui` |
| Open the latest HTML report | `npm.cmd run report` |
| TypeScript type check | `npm.cmd run typecheck` |

In UI Mode, select a file or test and use its run control. The HTML report lives under `e2e/playwright-report/`. For a failed test, the report links to its screenshot and retained browser trace, also available under `e2e/test-results/`. Open a trace from the report to inspect steps, DOM snapshots and network responses. To open a trace directly, run `npx.cmd playwright show-trace <path-to-trace.zip>` with the actual path.

### Test server and isolation

[Playwright configuration](e2e/playwright.config.ts) runs Chromium with one worker and zero retries. Each test starts with its own browser context. Keep the worker count at one until server and data isolation for parallel runs has been designed and verified.

Playwright's web server runs [the launcher](e2e/scripts/start-server.mjs). It builds the application with the Maven Wrapper, starts the packaged app on `127.0.0.1:18081` using the external [E2E Spring profile](e2e/config/application-e2e.properties), and waits for the management page. Existing servers are not reused. The launcher removes inherited Spring and JVM overrides and supplies the in-memory H2 URL, `create-drop` mode and loopback listener on the Java command line. This database is separate from both the persistent application database and the Java test database, and disappears when the server process stops.

The [test-data fixture](e2e/fixtures/test.ts) registers synthetic records before attempting to create them. It uses the application's form endpoints and reads IDs from the rendered management cards. Teardown runs in a `finally` block, even if a test assertion fails. It deletes only the registered employees and shifts, with employees removed first so their assignments do not block shift deletion. The fixture verifies removal and reports cleanup errors. Specs select explicit months and dates and may be run individually in any order.

### Page Objects and fixtures

[CalendarPage](e2e/pages/calendar-page.ts) and [ManagementPage](e2e/pages/management-page.ts) centralize selectors and repeated browser operations. Specs express the scenario and its assertions. Use role and label locators when available. For calendar cells, the CalendarPage combines the stable employee ID, ISO date and assignment layer attributes. Wait for an observable application response or UI state.

Add a spec under `e2e/tests/` and import the extended test from `fixtures/test.js`. Playwright supplies `calendar`, `management` and `testData` when requested by the test. The `.js` suffix is the Node ESM import for the TypeScript source.

```typescript
import { expect, test } from '../fixtures/test.js';

test('BR-012 saves a normal shift', async ({ calendar, testData }) => {
  const employee = await testData.createEmployee();
  const shift = await testData.createShift(8);
  await calendar.open(2026, 11);
  const cell = calendar.cell(employee.id, '2026-11-04', 'NORMAL');

  const response = await calendar.assign(cell, shift);

  expect(await response.text()).toBe('CREATED');
  await expect(cell).toHaveAttribute('data-shift-code', shift);
});
```

### Existing browser coverage

| Spec | Tests and rules |
| --- | --- |
| [calendar.spec.ts](e2e/tests/calendar.spec.ts) | Calendar load and both directions of navigation across December–January (BR-017), plus theme and palette persistence, shared accents and mobile palette selection (BR-023). |
| [management.spec.ts](e2e/tests/management.spec.ts) | Employee creation via the form with a vacation allocation (BR-002). |
| [assignments.spec.ts](e2e/tests/assignments.spec.ts) | Creation, replacement and reload (BR-012), clearing and persistence of deletion (BR-013), independent normal and standby rows (BR-010/BR-011), two-day rest locks and immediate release, both themes, month and year boundaries, and rest markers preserved after a reported conflict (BR-014/BR-015). |
| [shift-picker.spec.ts](e2e/tests/shift-picker.spec.ts) | Color groups, ascending hours, code tie-breaks and consistent ordering across employees, dates and both assignment rows (BR-025). |

## Regression strategy and boundary analysis

For a bug fix, reproduce the failing behavior on an isolated setup where practical, verify the expected failure reason, apply the fix and run the regression again. Assert the persisted state and the response together for write paths. Run the whole applicable suite before publishing. Obtain approval before changing a business rule. [Contributor instructions](AGENTS.md)

| Dimension | Existing test evidence | Proposed cases |
| --- | --- | --- |
| Date boundaries | November 30 → December 1 and 2, plus December 31 → January 1 and 2. | Leap and non-leap February, one missing month parameter and invalid month/date inputs. |
| Rest threshold | Exactly 24 h in either layer, ordinary shifts, `-` and `SZ`, plus immediate release after shortening or deleting a shift. | 23.99 h and 24.01 h, overlapping rest windows and the legacy conflict removal action in the browser. |
| Identity and negative saves | Wrong layer, duplicate keys and blocked replacement. | Missing employee and shift, unknown layer fallback, absent-key delete, an injected database failure to check rollback and validation responses for malformed input. |
| Vacation and home office | No automated summary assertions. | Negative, zero, 16 and 17 vacation hours, no work, rounded values around 40% and 50%, normal/standby/vacation mixtures and previous-month exclusion. |
| Catalog and dates | Startup uses the seeded `-` marker. | Whitespace, existing names and codes, negative and non-finite hours, protected types, referenced type deletion, skill selection and holiday overrides. |

## Concurrency testing

The lock is used during ordinary MockMvc writes. The suite has no controlled multi-request race. A duplicate insert test demonstrates the database invariant, while the rest rejection test demonstrates a validation failure rather than a rollback after a write.

Proposed integration coverage uses two independently executing requests and bounded synchronization so both reach the contested operation. Test simultaneous same-key saves and assert one final row with a coherent response to each request. Test competing writes for a 24-hour shift and work on either rest day, including a catalog change to 24 hours. Add a test that forces a repository failure inside a multi-write workflow once a rollback contract has been defined. Use fresh synthetic records and ensure timing does not decide assertions.

## Manual UI regression checklist

Run against a disposable H2 datasource with synthetic records. These are instructions for future manual execution.

- [ ] Open the calendar, move through December/January and leap-year February, and use the month/year picker. Confirm the two context days and that their shift pickers stay closed.
- [ ] Assign normal and standby shifts on the same date, replace normal and clear standby. Reload and compare cells and totals with expected values.
- [ ] Attempt work on either of the two days following a 24-hour shift. Verify the date and layer in conflict feedback, the lock styling and tooltip in both themes, existing `-` and `SZ` markers, and immediate release after shortening or deleting the source shift.
- [ ] Verify hours, count, night hours, standby hours, home-office percentage and displayed vacation balance using [BR-018 and BR-019](BUSINESS_RULES.md#br-018--monthly-vacation-balance).
- [ ] Toggle a default and a custom holiday and reload. Verify styling, names and persistence.
- [ ] Create, edit and delete synthetic employees, skills and shift types. Exercise duplicate and invalid inputs, referenced shift deletion and confirmation controls.
- [ ] Switch dark/colorful themes and reload. Hide and restore left and summary columns. Verify row highlighting, sticky headers, keyboard focus and horizontal scroll.
- [ ] Check at approximately 320, 900 and 1600 px and in a short viewport. Exercise the dropdowns, scroll containers and management panels.
- [ ] Interrupt a save or load request and observe the feedback and persisted state. Record console-only behavior as a gap.
- [ ] Export from management. Verify filename, all four sheets, full-data scope and assignment flags using synthetic data.

## Missing automation and candidates

| Level | Candidate coverage |
| --- | --- |
| Unit | Pure holiday/date calculation and, if extracted during an approved refactor, rest eligibility, layer normalization and summary formulas. |
| Integration | Management forms and flash feedback, holiday initialization and overrides, file-based migration on a disposable copy, malformed inputs, concurrency, forced rollback and workbook parsing with POI. |
| Playwright E2E | Extend the current suite with month/year picker interaction, holiday toggles, column visibility, mobile scrolling, management validation, failure feedback and workbook download. |

There are no configured CI workflows. A future CI job can run the Maven Wrapper on JDK 21 for pull requests, cache wrapper and Maven downloads, and publish Surefire results. A separate browser job can install Chromium and publish Playwright results from the isolated server. Ensure any screenshots or traces contain only synthetic data. [Testing backlog](TODO.md#improvement-opportunities)
