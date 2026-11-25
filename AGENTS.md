# AGENTS.md — Scheduler

## 1. Project context

Scheduler is an employee scheduling application built with Java 21, Spring Boot 4.1.0, Spring MVC and Spring Data JPA. It uses server-rendered Thymeleaf templates, CSS and JavaScript, builds with the Maven Wrapper and stores data in H2. It supports employee management, skills, shift types, calendar assignments, special days, vacation tracking and Excel export.

`CalendarController` serves the calendar and management pages and applies the current scheduling rules when saving assignments. `ExcelExportController` handles Excel exports using Apache POI.

Treat this description as orientation, not as a substitute for inspecting the actual repository. Verify the current architecture, dependencies, configuration and business rules before making changes.

The project owner is a QA professional who wants to understand the system, maintain control over its behavior and develop it incrementally with AI assistance.

## 2. Communication and working style

- Communicate with the project owner in Hungarian unless requested otherwise.
- Write new source identifiers, code comments, technical documentation and commit messages in English unless an existing convention requires otherwise. Preserve existing user-facing language and translations.
- Explain important technical decisions in plain language, including why a change is needed, how it works and what could go wrong.
- Distinguish verified facts from assumptions. Never claim that a test passed, a browser check was performed or a push succeeded unless it actually happened.
- For a small, clearly defined task, proceed directly. For a substantial change, first outline the intended steps, affected components, risks and verification strategy.
- Ask for clarification when a business rule is ambiguous or a decision could cause data loss, change existing behavior or substantially expand the scope. Do not silently invent requirements.
- Do not implement unrelated improvements without approval. Report them separately as suggestions.
- Obtain explicit approval from the project owner before changing the rules in this file. Authorization for an application change does not cover changes to `AGENTS.md`.

## 3. Preserve existing behavior

- Treat existing functionality and data as valuable. Preserve established behavior unless the task explicitly authorizes a change.
- Inspect relevant controllers, services, repositories, entities, templates, scripts, styles, configuration and tests before editing.
- Before adding functionality, check whether the behavior already exists in whole or in part. Reuse or extend the existing implementation where appropriate and avoid parallel or duplicate implementations.
- Check callers and dependencies before changing shared code, public interfaces or database structures.
- Keep changes small, coherent and independently verifiable. Avoid unnecessary rewrites, speculative abstractions and unrelated formatting changes.
- Always obtain explicit approval from the project owner before changing an existing business rule.
- Do not remove features, introduce new dependencies or upgrade frameworks merely because a different approach seems preferable.
- When refactoring, preserve observable behavior and add regression coverage where practical.

## 4. Code quality and architecture

- Follow the repository's existing conventions and use clear, descriptive names.
- Separate HTTP handling, business rules and persistence where appropriate. Avoid duplicating business rules across controllers or frontend scripts.
- Keep functions focused and avoid unnecessary complexity. Extract shared logic when it genuinely improves maintainability.
- Validate input on the backend; frontend validation is not a substitute for server-side validation.
- Handle errors explicitly. Do not swallow exceptions or expose stack traces and sensitive information to users.
- Use appropriate transactions for related database operations that must succeed or fail together.
- Prefer understandable, conventional solutions over clever ones.
- Add concise English comments explaining non-obvious business rules, invariants and technical trade-offs. Do not comment every obvious line.
- Do not hardcode secrets, credentials or machine-specific paths.

## 5. Scheduling business rules

Verify the actual implementation and approved requirements before changing scheduling logic. Pay particular attention to:

- Employee, date and shift assignment identity.
- Normal and on-call (standby) assignments and their independent handling.
- The database enforces uniqueness by employee, date and assignment layer. An employee can have at most one normal assignment and one standby assignment on the same day.
- Editing, replacing and removing assignments without losing unrelated entries.
- After a 24-hour normal shift, the following day's normal row may be empty or contain only the `-` unavailable marker, and the standby row must be empty. Check this rule when saving either day, including across month and year boundaries.
- Special days, holidays, weekends, vacation balances and working-hour calculations.
- Calendar navigation, date handling and Excel exports.

Do not invent legal or contractual scheduling rules. If the intended behavior is unclear, describe the ambiguity and ask the project owner before changing it.

## 6. Database and data safety

- Identify the actual database configuration and active database file before making persistence changes. The default H2 URL, `jdbc:h2:file:./data/scheduler-db`, is relative to the application's working directory. Starting from the outer workspace or the Maven project directory can therefore open different files.
- Never delete, reset, overwrite or silently repair existing user data.
- Before schema changes, migrations or potentially destructive operations, create a verified, recoverable backup of the affected database using a method appropriate for H2. Do not copy a live database file unless that method is known to be safe; stop the application first when necessary and authorized.
- Inspect existing records for duplicates, missing values and incompatible data before adding constraints.
- If inconsistent records are found, report them and obtain approval for any cleanup or reconciliation.
- Use explicit, repeatable migration steps where appropriate. Consider compatibility with existing installations and rollback or recovery procedures.
- The default configuration runs Hibernate schema updates first, then runs `assignment-constraints.sql` to add the assignment uniqueness constraint if it is missing.
- Keep related writes atomic. A failed replacement must not leave the original assignment deleted.
- Use database constraints for confirmed data invariants where appropriate, in addition to application validation.
- Run tests against isolated test databases. The current Spring Boot tests set an in-memory H2 datasource and Hibernate `create-drop` through `@SpringBootTest` properties. Verify the effective datasource and schema settings before running tests that write data.
- Do not commit or push database files, database dumps, backups, logs, credentials or personal employee data.

## 7. Testing and QA

Testing is part of implementation, not an optional final step.

### Before changing code

- Inspect existing tests and establish a baseline when practical.
- Identify the acceptance criteria and affected regression areas.
- If pre-existing failures are found, report them and distinguish them from failures introduced by the task.

### During implementation

- Add or update tests for new behavior, bug fixes and changed business rules.
- Include positive, negative, boundary and regression scenarios as appropriate.
- For bug fixes, add a regression test when practical and verify that it fails for the expected reason before the fix and passes after it.
- Verify persistence behavior, transactional rollback, duplicate prevention and independent normal/standby assignments when relevant.
- Test date boundaries, including end of month and end of year, when scheduling logic is affected.
- Prefer meaningful assertions over tests that merely increase coverage or check that no exception was thrown.
- Do not weaken, skip, remove or rewrite tests simply to obtain a passing build.

### After each coherent change

- Run the relevant tests and, before publishing a change, the full applicable automated test suite unless the owner explicitly agrees otherwise.
- Use the repository's Maven Wrapper if available. On Windows, use `.\mvnw.cmd test`, from the directory containing the wrapper and `pom.xml`.
- For UI changes, verify the affected views in a browser if browser tooling is available. Cover relevant interactions, the default dark and colorful themes, scrolling, responsive layouts and visible error states.
- If browser verification is unavailable, state that explicitly and provide concrete manual test steps. Do not claim a visual check based only on reading CSS or HTML.
- Report the exact commands or checks performed, pass/fail results, remaining risks and any manual testing still needed.
- Do not publish changes with unexplained failing tests. Stop and report blockers rather than hiding them.

## 8. Frontend and usability

- Preserve existing calendar behavior, including opening the shift picker by clicking a cell and clearing an assignment. Preserve controls, accessibility and keyboard behavior.
- Reuse shared styling and CSS variables where appropriate. Avoid unnecessary `!important` declarations and conflicting selectors.
- Keep the default dark and colorful themes consistent.
- Preserve meaningful colors used for shift types, warnings and scheduling states.
- Test sticky columns, hidden columns, horizontal scrolling and narrower windows when changing calendar layout.
- Avoid unrelated visual redesigns. Do not silently alter the user's preferred layout.
- Provide clear feedback for loading, successful actions, validation errors and failed saves where relevant.

## 9. Git workflow

- Inspect `git status`, the current branch and relevant diffs before editing.
- Preserve unrelated or uncommitted changes made by the project owner. Never discard or overwrite them without explicit permission.
- Check the staged diff and file list before committing. Stage only files related to the approved task; avoid indiscriminate `git add .`.
- Keep commits small, logically separated and independently buildable where practical. Include the tests needed to verify each change in its corresponding commit.
- Use descriptive English commit messages, preferably in Conventional Commits style, such as:
  - `fix(scheduling): preserve assignments when updates fail`
  - `test(scheduling): cover month-boundary rest days`
  - `refactor(ui): consolidate calendar column styles`
- For multi-step tasks, make a separate commit after each coherent, verified step when authorized.
- Commit and push only when explicitly authorized by the owner for the task or sequence of tasks. An instruction to commit and push each approved step applies to that sequence, not to unrelated future work.
- Before pushing, verify the intended branch, remote, commit contents and test results. Never push credentials, personal data or generated artifacts.
- Do not force-push, rewrite history, run destructive reset/clean operations, delete branches or resolve conflicting remote changes destructively without explicit permission.
- Report commit hashes, messages and actual push results. Do not claim remote synchronization without verification.

## 10. Security and privacy

- Treat employee names, schedules, vacation balances and database contents as potentially sensitive personal information.
- Use synthetic or anonymized data in tests, screenshots and examples.
- Do not upload project data, database contents, secrets or logs to external services without authorization.
- Inspect security implications of new endpoints, dependencies, exports and configuration changes.
- Do not disable security controls just to make a test or implementation easier.
- Keep development-only tools such as database consoles appropriately restricted for their intended environment.
- The default configuration enables the H2 console, and `H2ConsoleConfig` explicitly registers `/h2-console/*`. Account for that registration when reviewing deployment or changing console access.

## 11. Documentation and learning

- Keep documentation aligned with the actual code and configuration.
- Update relevant documentation when setup instructions, architecture, public interfaces, database schema or business rules change.
- Maintain concise explanations of important technical decisions, not a verbose log of every minor edit.
- At the end of development tasks, briefly explain the important technical decisions and why they were made so the project owner can understand how the application works. For significant changes, also explain where the change lives and how the main execution flow works.
- Point the owner to the key files and methods so they can inspect and understand the implementation themselves.
- When useful, explain an important concept (for example transactions, JPA constraints or regression testing) in the context of the actual change.

## 12. Definition of done

A task is complete when:

- The agreed scope and acceptance criteria are satisfied.
- Existing behavior and data have been preserved except for explicitly approved changes.
- Relevant tests and the applicable build have passed, or outstanding limitations are clearly disclosed and accepted.
- Required documentation and meaningful comments are updated.
- The diff has been reviewed for unrelated changes, privacy issues and accidental artifacts.
- Authorized commits and pushes have been completed and verified, when requested.

Finish substantial tasks with a concise Hungarian summary containing:

1. What changed and why.
2. Key files or methods affected.
3. Tests and verification actually performed, with results.
4. Commit hashes and push status, if applicable.
5. Remaining risks, assumptions, blockers and recommended manual checks.

Never present incomplete or unverified work as fully finished.
