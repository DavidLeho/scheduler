# Scheduler technical backlog

This backlog is based on the current [architecture](ARCHITECTURE.md), [business rules](BUSINESS_RULES.md) and [test coverage](TESTING.md). All items are proposals for separate work. Changes to existing business rules require owner approval under [AGENTS.md](AGENTS.md).

| Priority | Meaning |
| --- | --- |
| P0 | Critical bugs, security and data integrity |
| P1 | Functional issues and reliability |
| P2 | Maintainability and performance |
| P3 | Optional improvements and new features |

S is a contained change, M spans several related components or tests, and L requires a broader design, migration or rollout. Priorities describe impact if the relevant workflow is used, and estimates are relative.

## Confirmed defects and risks

### TD-001 — Protect shared deployment

- **Priority and classification.** P0, Confirmed security gap.
- **Problem.** The default app exposes schedule routes and full Excel export without application access control. The H2 servlet is registered explicitly under the default configuration.
- **Affected components.** Application properties, H2ConsoleConfig, MVC controllers.
- **Proposed solution.** Define a deployment profile and an approved authentication/authorization policy. Gate console registration and restrict employee and export access in shared deployments.
- **Acceptance criteria.** The local development workflow is documented. Shared mode denies unauthorized page, data, export and mutation access and has no active H2 console route.
- **Testing requirements.** Exercise anonymous, authorized and unauthorized requests and verify console availability by profile.
- **Complexity.** L.
- **Status.** Open.

### TD-002 — Preserve scheduling invariants when editing assigned shift types

- **Priority and classification.** P0, Confirmed integrity gap.
- **Problem.** Non-system type updates change the live flags and hours read by existing assignments. Promotion to 24 hours checks rest-day compatibility, while layer flag edits can still make historical assignments inconsistent.
- **Affected components.** CalendarController.updateShiftType, Assignment, shift_type.
- **Proposed solution.** Agree on how catalog updates affect historical rows. Implement validation, restricted edits or catalog versioning according to the approved policy.
- **Acceptance criteria.** An accepted edit cannot silently violate the approved historical and scheduling invariants. Rejected edits leave catalog and assignments unchanged.
- **Testing requirements.** Referenced normal-to-standby edit, protected types and permitted metadata edits. Retain the existing test for promotion to 24 hours with conflicting work.
- **Complexity.** L.
- **Status.** Open, policy approval required.

### TD-003 — Make employee and skill removal atomic

- **Priority and classification.** P0, Confirmed integrity gap.
- **Problem.** Employee deletion removes assignments before a separate employee delete. Skill deletion removes the catalog record and saves employees separately. A later failure can leave partial changes.
- **Affected components.** CalendarController.deleteEmployee, CalendarController.deleteSkill, Employee.removeSkill.
- **Proposed solution.** Use transaction boundaries covering each workflow and coordinate with relevant concurrent writes. Retain the current removal semantics pending approval of any behavior change.
- **Acceptance criteria.** A forced failure rolls back the complete operation. Successful removal preserves unrelated records.
- **Testing requirements.** Fault-injection rollback, happy paths, unknown IDs/names and concurrent saves against the same employee.
- **Complexity.** M.
- **Status.** Open.

### TD-004 — Handle malformed scheduling requests and transport errors

- **Priority and classification.** P1, Confirmed functional issue.
- **Problem.** Invalid dates or out-of-range numeric months can bypass business feedback. Several fetch failures reach only the browser console.
- **Affected components.** CalendarController, request binding, calendar.js.
- **Proposed solution.** Define explicit date and month validation and a consistent response contract. Surface network and server failures in the calendar while retaining established business tokens where needed.
- **Acceptance criteria.** Invalid input yields a predictable user-visible result and no write. Failed transport preserves the previous cell state and displays actionable feedback.
- **Testing requirements.** MockMvc malformed and missing inputs, plus browser failure simulation for load, save and delete.
- **Complexity.** M.
- **Status.** Open, public error contract to agree.

### TD-005 — Validate submitted employee skill selections

- **Priority and classification.** P1, Confirmed data validation gap.
- **Problem.** The server accepts arbitrary skill strings and duplicates. Employee skill storage lacks a foreign key to Skill. A delete removes only one occurrence per employee.
- **Affected components.** CalendarController.addEmployee, updateEmployee and deleteSkill, Employee, employee_skills.
- **Proposed solution.** Audit existing skill names and duplicates. Agree on normalization and membership checks before enforcing them. Reconciliation requires owner approval.
- **Acceptance criteria.** New writes follow the agreed catalog and duplicate policy. Existing invalid data is reported and preserved pending approval.
- **Testing requirements.** Direct form requests with unknown and duplicate names, normal selections, successful removal and rollback.
- **Complexity.** M.
- **Status.** Open, policy approval required.

## Improvement opportunities

### TD-006 — Bound calendar assignment reads to visible dates

- **Priority and classification.** P2, Improvement opportunity.
- **Problem.** Every month fetches all assignments before the browser filters to visible cells.
- **Affected components.** CalendarController.getAssignments, AssignmentRepository, calendar.js.
- **Proposed solution.** Introduce a range-aware read that covers the two preceding context days and the selected month. Preserve required behavior for existing clients and export.
- **Acceptance criteria.** A monthly request returns the required visible rows, and totals and context cells agree with the legacy behavior. Export retains all records.
- **Testing requirements.** Range and context-day tests at January and leap February, client compatibility and large synthetic history.
- **Complexity.** M.
- **Status.** Proposed.

### TD-007 — Consolidate left-column visibility handling

- **Priority and classification.** P2, Improvement opportunity.
- **Problem.** Two handlers and storage keys govern the same left-column visibility controls, making behavior and persisted preferences harder to reason about.
- **Affected components.** calendar.js, calendar.css, calendar.html.
- **Proposed solution.** Use one handler and one canonical key, with an explicit compatibility plan for existing browser preferences.
- **Acceptance criteria.** Each click updates visibility once. Existing preferences follow the agreed migration behavior and sticky offsets remain correct.
- **Testing requirements.** Browser checks for each combination, both legacy keys, reload and mixed summary/left preferences.
- **Complexity.** S.
- **Status.** Proposed.

### TD-008 — Establish repeatable schema migrations

- **Priority and classification.** P2, Improvement opportunity.
- **Problem.** Hibernate update plus one startup SQL script establishes the current schema, without a versioned change history or a dedicated upgrade test.
- **Affected components.** application.properties, assignment-constraints.sql, JPA entities.
- **Proposed solution.** Document a baseline and choose a versioned strategy after assessing existing installations. Include backup, duplicate inspection and an isolated replay.
- **Acceptance criteria.** A fresh database and an approved upgrade fixture reach the same expected schema with assignment rows intact. Incompatible records fail visibly.
- **Testing requirements.** Fresh install, upgrade, repeated startup and incompatible data tests on disposable files.
- **Complexity.** L.
- **Status.** Proposed.

### TD-009 — Reduce controller coupling

- **Priority and classification.** P2, Improvement opportunity.
- **Problem.** CalendarController combines request binding, seeding, holidays, management and scheduling decisions, which makes isolated verification harder.
- **Affected components.** CalendarController, repositories, ScheduleDay, HolidayDefaults.
- **Proposed solution.** Extract a focused assignment orchestration component when a change warrants it. Preserve lock lifetime, transactions, response values and rule ownership.
- **Acceptance criteria.** Existing callers and business rules retain their behavior. The transaction and employee lock still cover checks and persistence.
- **Testing requirements.** Full regression suite, focused rule tests and concurrency checks.
- **Complexity.** M.
- **Status.** Proposed.

### TD-010 — Automate QA gaps and add CI

- **Priority and classification.** P2, Improvement opportunity.
- **Problem.** Java and Chromium suites cover core rules. CI, parallel assignment tests and several browser regression scenarios remain open.
- **Affected components.** pom.xml, src/test, e2e and the affected browser workflows.
- **Proposed solution.** Add focused tests from [TESTING.md](TESTING.md#missing-automation-and-candidates) and CI in a separately approved task.
- **Acceptance criteria.** CI runs the isolated suites and reports failures. Added browser scenarios cover holiday changes, column preferences and export.
- **Testing requirements.** Clean CI runs with synthetic data and reproducible browser cases.
- **Complexity.** M.
- **Status.** Proposed.

## Unapproved feature ideas

### TD-011 — Define a cumulative vacation ledger

- **Priority and classification.** P3, Unapproved feature idea.
- **Problem.** The calendar calculates each month independently from the stored base. There is no cumulative leave accounting workflow.
- **Affected components.** Employee.vacationHours, calendar.js, assignment data.
- **Proposed solution.** Decide the accounting period, carryover, negative balances and historical edit policy before designing storage or UI.
- **Acceptance criteria.** An approved specification and examples exist before implementation. Any future ledger reconciles with the approved data model and preserves user data.
- **Testing requirements.** Cross-month/year accrual and deduction, historical corrections and edge cases defined by the approved policy.
- **Complexity.** L.
- **Status.** Idea, awaiting approval.

### TD-012 — Offer a period-specific Excel export

- **Priority and classification.** P3, Unapproved feature idea.
- **Problem.** The current workbook always contains the full dataset. Some uses may benefit from an explicitly selected period or dedicated calendar report.
- **Affected components.** ExcelExportController, manage.html, assignment queries.
- **Proposed solution.** Confirm workbook content, date selection and access requirements. Keep the full export available if required.
- **Acceptance criteria.** The approved period is reflected in the workbook contents and UI, with clear empty-range behavior.
- **Testing requirements.** Workbook parsing for range boundaries, empty data and compatibility with the current full export.
- **Complexity.** M.
- **Status.** Idea, awaiting approval.
