# Scheduler

Scheduler is a Hungarian-language web application for manually maintaining employee shift schedules. The calendar organizes assignments by employee and day, with separate normal and standby rows. The management page maintains the records used by the calendar.

## Current features

- Monthly calendar with previous and next month navigation and a month/year picker.
- Per-cell assignment, replacement and clearing. The server checks layer compatibility and the rest day after a 24-hour normal shift.
- Employee, skill and shift-type management. Shift types carry hours and night, standby and home-office flags.
- Default holidays for the years displayed, with manual holiday toggling.
- Monthly hours, shift count, night hours, standby hours, home-office percentage and displayed vacation balance.
- Dark and colorful themes, hideable calendar columns and responsive layouts.
- Downloadable Excel workbook containing employees, assignments, skills and shift types.

## Technology and requirements

| Area | Implementation |
| --- | --- |
| Runtime | Java 21, Spring Boot 4.1.0 and Spring MVC |
| UI | Thymeleaf, HTML, CSS and browser JavaScript |
| Persistence | Spring Data JPA, Hibernate and embedded H2 |
| Export | Apache POI OOXML 5.4.1 |
| Build and tests | Maven Wrapper pinned to Maven 3.9.16, Spring Boot Test, JUnit Jupiter, MockMvc, Playwright and TypeScript |

Use a JDK 21 installation available to the wrapper and a modern browser with JavaScript and local storage enabled. The first Maven invocation may need network access to download the distribution and dependencies. The application uses port 8080 with the default Spring Boot configuration.

## Install and run

Obtain a checkout of the repository and open a terminal in the directory containing `pom.xml` and `mvnw.cmd`. Keep this working directory consistent across launches so the same database opens.

On Windows:

```powershell
java -version
.\mvnw.cmd spring-boot:run
```

On macOS or Linux:

```sh
java -version
./mvnw spring-boot:run
```

Open [the calendar](http://localhost:8080/) or [the management page](http://localhost:8080/manage). An initial empty database receives sample employees, skills and shift types. [Startup rules](BUSINESS_RULES.md#br-001--initial-data)

## Build and test

| Task | Windows | macOS or Linux |
| --- | --- | --- |
| Run tests | `.\mvnw.cmd test` | `./mvnw test` |
| Package with tests | `.\mvnw.cmd clean package` | `./mvnw clean package` |
| Run the packaged application | `java -jar target/scheduler-0.0.1-SNAPSHOT.jar` | `java -jar target/scheduler-0.0.1-SNAPSHOT.jar` |

Build artifacts and Surefire reports go under `target/`. Tests use an in-memory H2 database. Add `-o` to Maven commands if the required artifacts are already cached and offline execution is needed. [Testing guide](TESTING.md)

### Browser tests

Install Node.js 24 with npm, then run these PowerShell commands from the repository root. Playwright builds and starts a separate local application on port 18081 with an in-memory H2 database. Keep that port free during the run.

```powershell
cd e2e
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd test
```

On macOS or Linux, use `npm` and `npx` in place of `npm.cmd` and `npx.cmd`. See the [E2E workflow](TESTING.md#playwright-e2e) for selecting tests, opening UI Mode and viewing reports.

## Database

The default connection is `jdbc:h2:file:./data/scheduler-db` with user `sa` and an empty password. The main database file is `data/scheduler-db.mv.db`, relative to the JVM working directory. An IDE run configuration launched from a parent directory can therefore open a different database from a terminal launched inside the repository. An explicit datasource URL can be supplied through Spring Boot configuration, for example with `SPRING_DATASOURCE_URL`.

Hibernate updates the schema at startup. The checked-in SQL then adds the assignment uniqueness constraint if it is missing. Before changing the schema of an existing installation, identify the active file, back it up and check for incompatible records. The default configuration enables the H2 console at `/h2-console` for local development. [Schema and configuration](ARCHITECTURE.md#database-schema)

## Excel export

Use **Excel export** on the management page or open [the export endpoint](http://localhost:8080/export/excel). It downloads `scheduler-export.xlsx` with four worksheets. The workbook covers the full dataset regardless of the month selected in the calendar. It contains employee data and should be handled accordingly. [Export rules](BUSINESS_RULES.md#br-021--excel-export)

## Known limitations

- The default project configuration has no application login or authorization and enables the database console. Treat it as local development configuration.
- The calendar fetches all assignments and matches them to visible cells in the browser.
- Vacation remaining is a selected-month calculation against a stored base. A cumulative annual vacation ledger is absent.
- Shift metadata is read from the current shift type, so catalog edits can alter historical display and totals.
- The workbook is an export of four record sets. There is no import workflow or special-day worksheet.
- The initial Chromium suite covers the main calendar and assignment workflows. Holiday changes, skill management and Excel export still lack dedicated browser coverage.

## Developer documentation

- [Architecture, schema and HTTP contracts](ARCHITECTURE.md)
- [Implemented business rules](BUSINESS_RULES.md)
- [Testing and QA](TESTING.md)
- [Prioritized technical backlog](TODO.md)
- [Contributor instructions](AGENTS.md)
