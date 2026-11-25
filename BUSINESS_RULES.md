# Implemented business rules

These rules describe current application behavior. Dates, employees and shift examples are synthetic. Test references describe dedicated assertions, with the full coverage inventory in [TESTING.md](TESTING.md). See [ARCHITECTURE.md](ARCHITECTURE.md#http-endpoints) for HTTP contracts.

## Rule catalog

### BR-001 — Initial data

At controller construction, empty skill, shift-type and employee repositories are seeded independently. Empty catalogs get skills A–E, shift types A (12 h day), B (8 h night), C (12 h standby/home office) and four sample employees when the employee repository is empty. System shift types are ensured separately.

**Example.** An empty database loads sample employees and can immediately display a grid.

**Source.** [Controller constructor](src/main/java/com/pufi/scheduler/CalendarController.java#L34)

**Automated coverage.** Context load exercises startup. Assignment tests also depend on the seeded `-` record. Seed counts and values have no dedicated assertions.

### BR-002 — Employee identity and vacation input

Create/update trims the name, rejects blank or case-insensitive duplicate names and requires a nonnegative integer vacation allocation. The update excludes the current ID from duplicate checks and rejects an unknown ID.

**Example.** ` Taylor ` becomes `Taylor`. A second employee named `taylor` or an allocation of −1 is rejected.

**Source.** [addEmployee](src/main/java/com/pufi/scheduler/CalendarController.java#L267) and [updateEmployee](src/main/java/com/pufi/scheduler/CalendarController.java#L304)

**Automated coverage.** [Management E2E](e2e/tests/management.spec.ts) covers successful creation with a vacation allocation. Invalid forms and duplicate names remain uncovered.

### BR-003 — Employee skill selections

Employee create/update stores the supplied list of skill names as strings. An omitted selection becomes an empty list. The form reads choices from the skill catalog, while the write handler performs no membership or duplicate check on the submitted list. Skills do not restrict shift eligibility.

**Example.** An employee update submitted with no checkboxes clears previous selections.

**Source.** [updateEmployee](src/main/java/com/pufi/scheduler/CalendarController.java#L304) and [Employee.java](src/main/java/com/pufi/scheduler/Employee.java)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-004 — Employee deletion

Deleting an existing employee first deletes all that employee's assignments across dates and layers, then deletes the employee. Missing IDs produce a flash error. The operation spans separate repository writes.

**Example.** Deleting one employee removes both their normal and standby assignments on the same day.

**Source.** [deleteEmployee](src/main/java/com/pufi/scheduler/CalendarController.java#L353)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-005 — Skill catalog

Skill creation trims name and optional description. Blank and exact duplicate names are rejected. Lookup uses the entered case. Editing changes only the trimmed description of an existing ID.

**Example.** ` Dispatch ` is saved as `Dispatch`. Creating another `Dispatch` is rejected. `dispatch` is a distinct value in the default database.

**Source.** [addSkill](src/main/java/com/pufi/scheduler/CalendarController.java#L539) and [updateSkillDescription](src/main/java/com/pufi/scheduler/CalendarController.java#L572)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-006 — Skill deletion

Deletion looks up an exact name, removes the catalog entry and iterates all employees, removing one occurrence of that skill name from each employee's list. Missing names produce a flash error. There is no skill-catalog foreign key behind the string list.

**Example.** Deleting `Dispatch` removes the usual single selection per employee. If a direct request previously stored the name twice, one duplicate can remain.

**Source.** [deleteSkill](src/main/java/com/pufi/scheduler/CalendarController.java#L595) and [Employee.removeSkill](src/main/java/com/pufi/scheduler/Employee.java)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-007 — Shift type fields and validation

The controller trims and uppercases codes, rejects blank or case-insensitive duplicates, rejects hours below zero and trims descriptions. An absent description becomes empty. Night, standby and home-office flags are set by checkbox parameter presence. An update rejects an unknown ID. The management form limits codes to 10 characters and offers half-hour increments. The controller does not enforce those two browser limits, an upper bound or a finite-number check.

**Example.** ` n8 ` with 8 hours and the night checkbox becomes `N8`. Zero hours pass the nonnegative check.

**Source.** [addShiftType](src/main/java/com/pufi/scheduler/CalendarController.java#L379), [updateShiftType](src/main/java/com/pufi/scheduler/CalendarController.java#L430) and [shift form](src/main/resources/templates/manage.html#L48)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-008 — System shift types

Startup creates or restores the metadata of `SZ` (8 h vacation) and `-` (0 h unavailable). Both are normal shifts with night, standby and home-office flags cleared. The management list excludes them, and update/delete handlers reject them.

**Example.** An attempt to delete `SZ` from management is rejected.

**Source.** [ensureSpecialShiftTypesExist](src/main/java/com/pufi/scheduler/CalendarController.java#L622), [updateShiftType](src/main/java/com/pufi/scheduler/CalendarController.java#L430) and [deleteShiftType](src/main/java/com/pufi/scheduler/CalendarController.java#L495)

**Automated coverage.** Assignment tests exercise the `-` marker. Catalog protection and `SZ` metadata have no dedicated assertions.

### BR-009 — Referenced shift types

Deletion is rejected if any assignment references the type. Updates to non-system types are allowed even when referenced, subject to the rest check when changing a type to 24 hours (BR-015). Assignment reads use the linked type's current metadata. Other edits can still alter historical totals or leave assignments inconsistent with the current flags.

**Example.** Changing an assigned type from 8 h to 24 h fails if a linked assignment would conflict with work on either of the following two days.

**Source.** [updateShiftType](src/main/java/com/pufi/scheduler/CalendarController.java#L430), [deleteShiftType](src/main/java/com/pufi/scheduler/CalendarController.java#L495) and [Assignment.java](src/main/java/com/pufi/scheduler/Assignment.java)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-010 — Normal and standby layers

`STANDBY` is matched case-insensitively. All other inputs, including omitted values, normalize to `NORMAL`. A shift's standby flag must agree with the requested layer. The browser hides mismatched picker choices.

**Example.** A standby shift submitted to the normal layer returns `STANDBY_ONLY_ALLOWED_IN_STANDBY_ROW`.

**Source.** [createOrUpdateAssignment](src/main/java/com/pufi/scheduler/CalendarController.java#L142) and [layer-specific picker styles](src/main/resources/static/calendar.css#L673)

**Automated coverage.** [rejectsShiftTypesInTheWrongLayer](src/test/java/com/pufi/scheduler/AssignmentIntegrationTests.java#L84) covers both mismatch directions. [Assignment E2E](e2e/tests/assignments.spec.ts) covers normal and standby in separate rows. Fallback inputs are untested.

### BR-011 — Assignment uniqueness

An assignment has a generated ID and a scheduling key of employee, date and layer. The database rejects duplicate keys while allowing one normal and one standby entry on the same day.

**Example.** A normal and a standby record for one employee on 2026-11-30 can coexist. A second direct insert into either layer violates the constraint.

**Source.** [assignment-constraints.sql](src/main/resources/assignment-constraints.sql) and [AssignmentRepository.java](src/main/java/com/pufi/scheduler/AssignmentRepository.java)

**Automated coverage.** [databaseRejectsDuplicateAssignmentsInEitherLayer](src/test/java/com/pufi/scheduler/AssignmentIntegrationTests.java#L120)

### BR-012 — Assignment create and update

The save handler validates employee, shift, layer and the rest rule. It inserts a missing key and returns `CREATED`, or updates the linked type of the existing row in place and returns `UPDATED`. Unknown employee or shift IDs return their respective `*_NOT_FOUND` tokens.

**Example.** Replacing an 8 h normal entry with a 12 h type retains the normal assignment ID and the same-day standby entry.

**Source.** [createOrUpdateAssignment](src/main/java/com/pufi/scheduler/CalendarController.java#L142)

**Automated coverage.** [updatesNormalAssignmentInPlaceAndKeepsStandbySeparate](src/test/java/com/pufi/scheduler/AssignmentIntegrationTests.java#L63) covers creation and replacement. [Assignment E2E](e2e/tests/assignments.spec.ts) covers both operations and persistence across reload. Missing IDs are untested.

### BR-013 — Assignment deletion

DELETE looks up employee, exact date text and normalized layer. It deletes the matching row and returns `OK`, returns `NOT_FOUND` if the row is absent or returns `EMPLOYEE_NOT_FOUND` for an unknown employee. The browser clears the display on `OK` or `NOT_FOUND`.

**Example.** Clearing standby leaves the same-day normal shift intact.

**Source.** [deleteAssignment](src/main/java/com/pufi/scheduler/CalendarController.java#L209) and [deleteAssignmentFromCell](src/main/resources/static/calendar.js#L101)

**Automated coverage.** [updatesNormalAssignmentInPlaceAndKeepsStandbySeparate](src/test/java/com/pufi/scheduler/AssignmentIntegrationTests.java#L63) covers a successful standby deletion. [Assignment E2E](e2e/tests/assignments.spec.ts) covers clearing normal and standby cells. Missing-record cases are untested.

### BR-014 — Two rest days after a 24-hour shift

A shift of exactly 24 hours in either layer requires the next two calendar days to be rest days. The server rejects normal work and standby on those days. An empty row, a normal `-` marker or a normal `SZ` vacation marker is compatible with rest. Markers are assigned manually. The rule does not create any assignment.

The calendar disables the pickers in both rows and shows a distinct background and a tooltip with the triggering date. It recalculates the locks after a successful save or deletion. If an older assignment conflicts, the cell keeps its value and offers an explicit removal action in its own month. One remaining qualifying shift is enough to keep a day locked.

**Example.** A 24 h standby shift on 2026-12-31 locks both rows on 2027-01-01 and 2027-01-02. January 3 is outside that lock.

**Source.** [findRestConflict](src/main/java/com/pufi/scheduler/CalendarController.java#L762) and [updateRestLocks](src/main/resources/static/calendar.js#L150)

**Automated coverage.** [Java integration tests](src/test/java/com/pufi/scheduler/AssignmentIntegrationTests.java) and [assignment E2E](e2e/tests/assignments.spec.ts) cover both layers, shortening and deleting a 24-hour shift, both calendar boundaries and the rest markers. E2E also checks disabled buttons, tooltip text and both themes.

### BR-015 — Rest rule when saving the earlier day

Before creating or replacing an assignment with a 24-hour type, the next two calendar days must contain no normal work and no standby. Existing normal `-` and `SZ` markers are preserved and do not block the save. If there is a conflict, the save is rejected and the calendar reports the conflicting date and layer. Changing a used shift type to 24 hours validates its affected assignments before updating the catalog.

**Example.** A December 31 24-hour shift can be saved if January 1 has `-` and January 2 has `SZ`. A standby assignment on January 2 prevents the save and stays in place.

**Source.** [findRestConflict](src/main/java/com/pufi/scheduler/CalendarController.java#L762) and [findRestViolationForShiftTypeUpdate](src/main/java/com/pufi/scheduler/CalendarController.java#L790)

**Automated coverage.** [Java integration tests](src/test/java/com/pufi/scheduler/AssignmentIntegrationTests.java) check rejection without mutation, catalog changes and explicit cleanup of legacy conflicts. [Assignment E2E](e2e/tests/assignments.spec.ts) checks a second-day conflict across months and an allowed save after clearing it.

### BR-016 — Assignment serialization

Assignment POST and DELETE use an employee row lock in a transaction. POST also locks the selected shift type before the employee. A catalog change that increases a used type to 24 hours locks the affected employee rows in ID order under the shift-type lock. This keeps the check and update against the same scheduling state.

**Example.** Two requests that schedule the earlier 24-hour shift and the next day's standby change for the same employee are checked serially through these endpoints.

**Source.** [createOrUpdateAssignment](src/main/java/com/pufi/scheduler/CalendarController.java#L142), [deleteAssignment](src/main/java/com/pufi/scheduler/CalendarController.java#L209) and [EmployeeRepository.java](src/main/java/com/pufi/scheduler/EmployeeRepository.java)

**Automated coverage.** Integration tests exercise ordinary transactional writes. There is no parallel-write test or forced rollback test.

### BR-017 — Month selection and calendar cells

Calendar and management default to the server's current month if either query value is absent. The calendar shows the selected month and two preceding days, labels days in Hungarian and marks weekends, today and holidays independently. The browser allows opening shift pickers only on current-month cells. The HTTP assignment API has no selected-month restriction.

**Example.** January displays December 30 and 31 as context. February includes 29 only when the selected year is a leap year.

**Source.** [calendar](src/main/java/com/pufi/scheduler/CalendarController.java#L72), [createScheduleDays](src/main/java/com/pufi/scheduler/CalendarController.java#L658), [ScheduleDay.java](src/main/java/com/pufi/scheduler/ScheduleDay.java) and [cell picker handler](src/main/resources/static/calendar.js#L9)

**Automated coverage.** [Calendar E2E](e2e/tests/calendar.spec.ts) verifies the monthly calendar and navigation across a year boundary. The two context days and leap-year layout have no dedicated assertions.

### BR-018 — Monthly vacation balance

The browser subtracts the selected month's `SZ` hours from the employee's stored vacation allocation. It does not write back the balance or reject assignments that drive the displayed value below zero. Negative balances and balances from 0 through 16 h get separate styles.

**Example.** With a 24 h allocation and two 8 h `SZ` entries, the selected month shows 8 h remaining. The next month calculates from the 24 h base again.

**Source.** [updateEmployeeSummary](src/main/resources/static/calendar.js#L266)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-019 — Monthly hours and home-office percentage

Only current-month cells contribute. Ordinary normal work contributes count and total hours, plus night or home-office hours if flagged. Standby contributes only to standby hours. `SZ` adds to total and vacation use without increasing the shift count. `-` contributes nothing. Home-office percentage is rounded to a whole number, defaults to 0 when total is zero and changes color above 40% and above 50%.

**Example.** An 8 h home-office normal shift, 8 h `SZ` and 6 h standby yield 16 h total, one shift, 6 h standby and 50% home office.

**Source.** [updateEmployeeSummary](src/main/resources/static/calendar.js#L266) and [calculateHomeOfficePercent](src/main/resources/static/calendar.js#L367)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-020 — Holidays and special-day overrides

Calendar loading inserts absent default holiday records for all years represented by its date range. Defaults are January 1, March 15, May 1, August 20, October 23, November 1 and December 25–26, plus Good Friday, Easter Monday and Pentecost Monday. Toggling a holiday sets it to `NORMAL` with an empty name. Turning it on uses the default name if known or `Egyedi piros betűs nap`. Existing overrides survive default initialization. Holidays and weekends affect display and do not block assignment creation. `WORKING_DAY` exists in the model without a management flow or distinct calendar rendering.

**Example.** Turning off a default holiday keeps it off after reopening the month, since the date row still exists.

**Source.** [toggleHoliday](src/main/java/com/pufi/scheduler/CalendarController.java#L241), [ensureFixedSpecialDaysExist](src/main/java/com/pufi/scheduler/CalendarController.java#L696) and [HolidayDefaults.java](src/main/java/com/pufi/scheduler/HolidayDefaults.java)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-021 — Excel export

The download includes all employees, assignments, skills and shift types in `Dolgozók`, `Beosztások`, `Skillek` and `Műszakok`. Assignments include date text, employee and shift references, shift code, hours, flags and description. Flags use `igen`/`nem`. The assignment layer is not a separate column. Employee vacation represents the stored allocation. Special days and monthly summaries are outside the workbook.

**Example.** Downloading from November also includes December assignments and the current shift-type metadata linked to them.

**Source.** [ExcelExportController.java](src/main/java/com/pufi/scheduler/ExcelExportController.java#L38)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-022 — HTTP and form validation

Management requests require year/month redirect context and their declared form fields. Explicit rule failures and successful submissions use flash messages. Binding errors may be handled by Spring MVC. Assignment saves parse an ISO date during rest validation, while DELETE uses the supplied date as text. An invalid date or out-of-range numeric month can reach default error handling.

**Example.** A numeric month of `13` can throw during page rendering. A DELETE containing a nonmatching date string can return `NOT_FOUND`.

**Source.** [calendar](src/main/java/com/pufi/scheduler/CalendarController.java#L72), [deleteAssignment](src/main/java/com/pufi/scheduler/CalendarController.java#L209) and [validateTwentyFourHourRule](src/main/java/com/pufi/scheduler/CalendarController.java#L752)

**Automated coverage.** No dedicated automated assertion in the current suite.

### BR-023 — Browser calendar preferences

Clicking an employee name highlights the paired rows. Enabling the colorful theme reveals a palette selector on the calendar. The palette applies to interface accents on both pages, while shift and warning colors keep their existing meanings. Theme, palette and hidden-column preferences use local storage. Calendar month changes use page navigation. Mutation responses update the selected cell or reload the page for holiday toggles.

**Example.** Hiding an hours column changes the browser's view of the table and leaves assignment records intact.

**Source.** [summary visibility](src/main/resources/static/calendar.js#L519), [employee row highlighting](src/main/resources/static/calendar.js#L562) and [theme.js](src/main/resources/static/theme.js)

**Automated coverage.** [Calendar E2E](e2e/tests/calendar.spec.ts) verifies theme toggling, palette persistence, shared accents on the management page and selector visibility on a narrow viewport. Column preferences and highlighting remain uncovered.

### BR-024 — Shift display

Ordinary cells show hours with a decimal comma when needed and append `HO` for home office. Night and standby flags determine the corresponding display style. Vacation shows `SZ`. Both an empty cell and an unavailable assignment show `-`, but they have different styles and only the unavailable assignment has shift metadata and an explanatory tooltip.

**Example.** A 7.5-hour home-office assignment displays `7,5HO`. Clearing it displays the empty-cell marker and removes its assignment metadata.

**Source.** [clearCell and formatCellText](src/main/resources/static/calendar.js#L152) and [shift classes and tooltips](src/main/resources/static/calendar.js#L200)

**Automated coverage.** [Assignment E2E](e2e/tests/assignments.spec.ts) checks ordinary shift hours and the cleared cell display. Decimal, home-office and tooltip formatting remain uncovered.

### BR-025 — Shift picker order

Each picker starts with `Üres` (clear). Normal choices follow in this order: gold day shifts, purple night shifts and the gray `-` and `SZ` markers. Standby choices show blue day standby before light-blue night standby. Within each color group, choices are ordered by increasing hours, then by shift code using Hungarian alphabetical order. Each cell applies the same ordering to the available shift catalog.

**Example.** Gold options with codes `N6` (6 h), `A` (12 h) and `N12` (12 h) appear in that order. The gray group shows `-` (0 h) before `SZ` (8 h).

**Source.** [initializeShiftPickerOptions](src/main/resources/static/calendar.js#L404)

**Automated coverage.** [Shift picker E2E](e2e/tests/shift-picker.spec.ts) checks both rows, all color groups, hour and code ordering, and the same result across two employees and dates using newly created types.

## Unresolved product questions

- The stored vacation allocation and selected-month balance do not establish an annual accounting policy. Carryover, cross-month deduction and approval requirements need a product decision.
- Editing assigned shift types currently affects historical output. Whether historical assignments should keep a snapshot or follow catalog corrections needs a product decision.
- The holiday defaults are application data. Legal working-day substitutions, enforceable scheduling policies and additional holiday types require approved requirements.
- The desired handling of unknown assignment layers, duplicate skill selections, invalid dates and direct API writes outside the displayed month is undocumented. The entries above describe the current behavior. Changes to those rules require approval under [AGENTS.md](AGENTS.md).

Potential engineering work is tracked in [TODO.md](TODO.md).
