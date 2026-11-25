# Testing and QA

The current suite has six JUnit Jupiter tests across two classes. It focuses on Spring context startup and the assignment write path. See [Business rules](BUSINESS_RULES.md) for rule identifiers and [Architecture](ARCHITECTURE.md) for the HTTP and persistence flow.

## Execution

Run from the repository root, alongside `pom.xml`. Use JDK 21. The wrapper downloads its pinned Maven distribution and resolves dependencies on first use.

| Task | Windows | macOS or Linux |
| --- | --- | --- |
| Full test suite | `.\mvnw.cmd test` | `./mvnw test` |
| Assignment integration tests | `.\mvnw.cmd "-Dtest=AssignmentIntegrationTests" test` | `./mvnw -Dtest=AssignmentIntegrationTests test` |
| One rest-rule test | `.\mvnw.cmd "-Dtest=AssignmentIntegrationTests#protectsTheFirstDayOfTheNextMonthAfterATwentyFourHourShift" test` | `./mvnw -Dtest=AssignmentIntegrationTests#protectsTheFirstDayOfTheNextMonthAfterATwentyFourHourShift test` |
| Clean package with tests | `.\mvnw.cmd clean package` | `./mvnw clean package` |

Surefire writes XML and text reports to `target/surefire-reports/`. During this documentation review, `.\mvnw.cmd -o test` completed successfully on Windows with **6 tests, 0 failures, 0 errors and 0 skipped**. Browser and concurrency checks below are manual or proposed.

## Frameworks, isolation and fixtures

- [pom.xml](pom.xml) declares Spring Boot's Thymeleaf and Web MVC test starters in test scope. JUnit Jupiter executes tests, Spring Boot Test loads the application context, and Spring MVC Test supplies MockMvc. Maven Surefire runs both test classes.
- Both classes use `@SpringBootTest` with `jdbc:h2:mem:scheduler-test` and Hibernate `create-drop`. Hibernate builds the tables and the production SQL initializer adds the unique constraint. The tests exercise neither file-based startup updates nor a developer's persistent database.
- [AssignmentIntegrationTests](src/test/java/com/pufi/scheduler/AssignmentIntegrationTests.java) builds MockMvc from the real web application context. Requests go through binding, the controller, transactions, repositories and H2 without opening a browser or network socket.
- Each test creates its own synthetic employee and shift types. A startup-seeded system shift supplies `-`. Assignment requests commit normally and repositories inspect persisted results. Test isolation depends on per-test employee IDs and the in-memory context lifecycle, so fixtures should avoid assertions against global row counts.

## Existing test inventory and coverage

| Test | Main check | Rule coverage |
| --- | --- | --- |
| `SchedulerApplicationTests.contextLoads` | The Spring application context starts with the isolated datasource and startup initialization. | Indirect exercise of BR-001 and startup SQL. |
| `updatesNormalAssignmentInPlaceAndKeepsStandbySeparate` | Both layers can be saved. Normal replacement preserves its ID and standby values. Deleting standby preserves normal. | BR-011 to BR-013. |
| `rejectsShiftTypesInTheWrongLayer` | Both mismatch directions return the expected text and persist no rows. | BR-010. |
| `protectsTheFirstDayOfTheNextMonthAfterATwentyFourHourShift` | A November 30 24-hour shift rejects normal and standby work on December 1 and accepts the normal `-` marker. | BR-014 and month-boundary behavior. |
| `rejectsUpdatingToTwentyFourHoursWhenTheNextMonthAlreadyHasWork` | December 1 normal work and standby both prevent a November 30 upgrade. A rejected attempt leaves the old shift type in place. After removing standby, an existing `-` marker permits the update. | BR-012 and BR-015. |
| `databaseRejectsDuplicateAssignmentsInEitherLayer` | Direct repository inserts raise `DataIntegrityViolationException` for duplicate keys in both layers, and the two original rows remain. | BR-011. |

Sources are [context test](src/test/java/com/pufi/scheduler/SchedulerApplicationTests.java) and [assignment integration tests](src/test/java/com/pufi/scheduler/AssignmentIntegrationTests.java).

## Regression strategy and boundary analysis

For a bug fix, reproduce the failing behavior on an isolated setup where practical, verify the expected failure reason, apply the fix and run the regression again. Assert the persisted state and the response together for write paths. Run the whole applicable suite before publishing. Obtain approval before changing a business rule. [Contributor instructions](AGENTS.md)

| Dimension | Existing test evidence | Proposed cases |
| --- | --- | --- |
| Date boundaries | November 30 → December 1, in both write orders. | December 31 → January 1, leap and non-leap February, one missing month parameter and invalid month/date inputs. |
| Rest threshold | Exactly 24 h, ordinary shifts and a next-day unavailable marker. | 23.99 h and 24.01 h, a 24 h standby shift, vacation immediately after 24 h and same-day layer interactions. |
| Identity and negative saves | Wrong layer, duplicate keys and blocked replacement. | Missing employee and shift, unknown layer fallback, absent-key delete, an injected database failure to check rollback and validation responses for malformed input. |
| Vacation and home office | No automated summary assertions. | Negative, zero, 16 and 17 vacation hours, no work, rounded values around 40% and 50%, normal/standby/vacation mixtures and previous-month exclusion. |
| Catalog and dates | Startup uses the seeded `-` marker. | Whitespace, existing names and codes, negative and non-finite hours, protected types, referenced type deletion, skill selection and holiday overrides. |

## Concurrency testing

The lock is used during ordinary MockMvc writes. The suite has no controlled multi-request race. A duplicate insert test demonstrates the database invariant, while the rest rejection test demonstrates a validation failure rather than a rollback after a write.

Proposed integration coverage uses two independently executing requests and bounded synchronization so both reach the contested operation. Test simultaneous same-key saves and assert one final row with a coherent response to each request. Test adjacent-day writes where a 24-hour normal shift and next-day standby compete and assert that both cannot persist. Add a test that forces a repository failure inside a multi-write workflow once a rollback contract has been defined. Use fresh synthetic records and ensure timing does not decide assertions.

## Manual UI regression checklist

Run against a disposable H2 datasource with synthetic records. These are instructions for future manual execution.

- [ ] Open the calendar, move through December/January and leap-year February, and use the month/year picker. Confirm the two context days and that their shift pickers stay closed.
- [ ] Assign normal and standby shifts on the same date, replace normal and clear standby. Reload and compare cells and totals with expected values.
- [ ] Attempt adjacent-day work before and after saving a 24-hour normal shift. Confirm rejection feedback and the normal `-` exception.
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
| Playwright E2E | Navigation, assignment success and rejection, holiday toggle, theme persistence, column visibility, mobile scroll and downloadable workbook. Start the app with an isolated datasource per run, seed synthetic data and use deterministic dates. |

There are no checked-in Playwright tests or CI workflows. A future CI job can run the Maven Wrapper on JDK 21 for pull requests, cache wrapper and Maven downloads, and publish Surefire results. Add a separate browser job after an E2E harness exists and ensure any screenshots or traces contain only synthetic data. [Testing backlog](TODO.md#improvement-opportunities)
