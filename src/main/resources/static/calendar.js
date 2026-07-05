/* ---------- Schedule table assignment handling ---------- */

function closeAllPickers() {
    document.querySelectorAll(".assignment-cell.open").forEach(cell => {
        cell.classList.remove("open");
    });
}

document.addEventListener("click", event => {
    const displayButton = event.target.closest(".schedule-cell-display");
    const pickerOption = event.target.closest(".shift-picker-option");

    if (displayButton) {
        event.stopPropagation();

        const cell = displayButton.closest(".assignment-cell");

        if (!cell) {
            return;
        }

        const wasOpen = cell.classList.contains("open");

        closeAllPickers();

        if (!wasOpen) {
            cell.classList.add("open");
        }

        return;
    }

    if (pickerOption) {
        event.stopPropagation();

        const cell = pickerOption.closest(".assignment-cell");

        if (!cell) {
            return;
        }

        if (pickerOption.dataset.clear === "true") {
            deleteAssignmentFromCell(cell);
        } else {
            saveAssignmentToCell(cell, pickerOption);
        }

        closeAllPickers();
        return;
    }

    closeAllPickers();
});

function saveAssignmentToCell(cell, option) {
    const assignment = {
        employeeId: Number(cell.dataset.employeeId),
        date: cell.dataset.date,
        assignmentLayer: cell.dataset.assignmentLayer,
        shiftTypeId: Number(option.dataset.shiftId)
    };

    fetch("/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignment)
    })
        .then(response => response.text())
        .then(result => {
            if (result === "CREATED" || result === "UPDATED" || result === "OK") {
                applyShiftToCell(cell, {
                    shiftTypeId: Number(option.dataset.shiftId),
                    shiftCode: option.dataset.code,
                    assignmentLayer: cell.dataset.assignmentLayer,
                    hours: Number(option.dataset.hours),
                    night: option.dataset.night === "true",
                    standby: option.dataset.standby === "true",
                    homeOffice: option.dataset.homeOffice === "true",
                    shiftDescription: option.dataset.description || ""
                });
            } else if (result === "STANDBY_ONLY_ALLOWED_IN_STANDBY_ROW") {
                alert("Készenlétet csak az alsó készenléti sorba lehet tenni.");
            } else if (result === "NORMAL_ONLY_ALLOWED_IN_NORMAL_ROW") {
                alert("Ezt a műszakot csak a felső normál sorba lehet tenni.");
            } else {
                alert("Nem sikerült menteni a beosztást.");
            }
        })
        .catch(error => console.error("Hiba a beosztás mentésénél:", error));
}

function deleteAssignmentFromCell(cell) {
    const params = new URLSearchParams({
        employeeId: cell.dataset.employeeId,
        date: cell.dataset.date,
        assignmentLayer: cell.dataset.assignmentLayer
    });

    fetch(`/assignments?${params.toString()}`, {
        method: "DELETE"
    })
        .then(response => response.text())
        .then(result => {
            if (result === "OK" || result === "NOT_FOUND") {
                clearCell(cell);
            } else {
                alert("Nem sikerült törölni a beosztást.");
            }
        })
        .catch(error => console.error("Hiba a beosztás törlésénél:", error));
}

function applyShiftToCell(cell, assignment) {
    const display = cell.querySelector(".schedule-cell-display");

    display.textContent = formatCellText(assignment);

    display.classList.remove(
        "empty-cell",
        "shift-normal",
        "shift-ho",
        "shift-night",
        "shift-standby",
        "shift-standby-night",
        "shift-vacation",
        "shift-unavailable"
    );

    display.classList.add(getShiftClass(assignment));

    display.title = buildShiftTitle(assignment);

    cell.dataset.shiftTypeId = assignment.shiftTypeId;
    cell.dataset.shiftCode = assignment.shiftCode;
    cell.dataset.hours = assignment.hours;
    cell.dataset.night = assignment.night;
    cell.dataset.standby = assignment.standby;
    cell.dataset.homeOffice = assignment.homeOffice;

    updateEmployeeSummary(cell.dataset.employeeId);
}

function clearCell(cell) {
    const display = cell.querySelector(".schedule-cell-display");

    display.textContent = "-";
    display.title = "";

    display.classList.remove(
        "shift-normal",
        "shift-ho",
        "shift-night",
        "shift-standby",
        "shift-standby-night",
        "shift-vacation",
        "shift-unavailable"
    );

    display.classList.add("empty-cell");

    delete cell.dataset.shiftTypeId;
    delete cell.dataset.shiftCode;
    delete cell.dataset.hours;
    delete cell.dataset.night;
    delete cell.dataset.standby;
    delete cell.dataset.homeOffice;

    updateEmployeeSummary(cell.dataset.employeeId);
}

function formatCellText(assignment) {
    const shiftCode = (assignment.shiftCode || "").toUpperCase();

    if (shiftCode === "SZ") {
        return "SZ";
    }

    if (shiftCode === "-") {
        return "-";
    }

    const hoursText = formatHours(assignment.hours);

    if (assignment.homeOffice) {
        return hoursText + "HO";
    }

    return hoursText;
}

function getShiftClass(assignment) {
    const shiftCode = (assignment.shiftCode || "").toUpperCase();

    if (shiftCode === "SZ") {
        return "shift-vacation";
    }

    if (shiftCode === "-") {
        return "shift-unavailable";
    }

    if (assignment.standby && assignment.night) {
        return "shift-standby-night";
    }

    if (assignment.standby) {
        return "shift-standby";
    }

    if (assignment.night) {
        return "shift-night";
    }

    return "shift-normal";
}

function buildShiftTitle(assignment) {
    const shiftCode = (assignment.shiftCode || "").toUpperCase();

    if (shiftCode === "SZ") {
        return "SZ - Szabadság - 8 óra";
    }

    if (shiftCode === "-") {
        return "- - Nem szeretne dolgozni";
    }

    const parts = [];

    parts.push(formatCellText(assignment));

    parts.push(assignment.standby ? "készenlét" : "normál");
    parts.push(assignment.night ? "éjszakai" : "nappali");
    parts.push(assignment.homeOffice ? "HO" : "iroda");

    if (assignment.shiftDescription) {
        parts.push(assignment.shiftDescription);
    }

    return parts.join(" - ");
}

function formatHours(hours) {
    if (hours === null || hours === undefined || Number.isNaN(Number(hours))) {
        return "";
    }

    const number = Number(hours);

    if (Number.isInteger(number)) {
        return String(number);
    }

    return String(number).replace(".", ",");
}

function updateEmployeeSummary(employeeId) {
    const mainRow = document.querySelector(
        `.employee-main-row[data-row-employee-id="${employeeId}"]`
    );

    if (!mainRow) {
        return;
    }

    let totalHours = 0;
    let shiftCount = 0;
    let nightHours = 0;
    let standbyHours = 0;
    let homeOfficeHours = 0;
    let vacationUsedHours = 0;

    const vacationBaseHours = Number(mainRow.dataset.vacationHours || 0);

    const cells = document.querySelectorAll(
        `.assignment-cell[data-employee-id="${employeeId}"]`
    );

    cells.forEach(cell => {
        if (cell.dataset.currentMonth !== "true") {
            return;
        }

        const shiftCode = (cell.dataset.shiftCode || "").toUpperCase();
        const hours = Number(cell.dataset.hours);
        const layer = cell.dataset.assignmentLayer;

        if (Number.isNaN(hours)) {
            return;
        }

        if (shiftCode === "SZ") {
            vacationUsedHours += hours;
            return;
        }

        if (shiftCode === "-") {
            return;
        }

        shiftCount += 1;

        if (layer === "STANDBY") {
            standbyHours += hours;
            return;
        }

        totalHours += hours;

        if (cell.dataset.night === "true") {
            nightHours += hours;
        }

        if (cell.dataset.homeOffice === "true") {
            homeOfficeHours += hours;
        }
    });

    const vacationRemainingHours = vacationBaseHours - vacationUsedHours;

    mainRow.querySelector(".row-total-hours").textContent = formatHours(totalHours);
    mainRow.querySelector(".row-shift-count").textContent = shiftCount;
    mainRow.querySelector(".row-night-hours").textContent = formatHours(nightHours);
    mainRow.querySelector(".row-standby-hours").textContent = formatHours(standbyHours);

    const hoPercentCell = mainRow.querySelector(".row-ho-hours");
    const hoPercent = calculateHomeOfficePercent(homeOfficeHours, totalHours);

    hoPercentCell.textContent = hoPercent + "%";

    hoPercentCell.classList.remove(
        "ho-percent-ok",
        "ho-percent-warning",
        "ho-percent-danger"
    );

    if (hoPercent <= 40) {
        hoPercentCell.classList.add("ho-percent-ok");
    } else if (hoPercent <= 50) {
        hoPercentCell.classList.add("ho-percent-warning");
    } else {
        hoPercentCell.classList.add("ho-percent-danger");
    }

    const vacationCell = mainRow.querySelector(".vacation-cell");
    vacationCell.textContent = formatHours(vacationRemainingHours);

    vacationCell.classList.remove("vacation-negative", "vacation-low");

    if (vacationRemainingHours < 0) {
        vacationCell.classList.add("vacation-negative");
    } else if (vacationRemainingHours <= 16) {
        vacationCell.classList.add("vacation-low");
    }
}

function calculateHomeOfficePercent(homeOfficeHours, totalHours) {
    if (totalHours <= 0) {
        return 0;
    }

    return Math.round((homeOfficeHours / totalHours) * 100);
}

function updateAllSummaries() {
    document.querySelectorAll(".employee-main-row").forEach(row => {
        updateEmployeeSummary(row.dataset.rowEmployeeId);
    });
}

function loadAssignments() {
    fetch("/assignments")
        .then(response => response.json())
        .then(assignments => {
            assignments.forEach(assignment => {
                const layer = assignment.assignmentLayer || "NORMAL";

                const cell = document.querySelector(
                    `.assignment-cell[data-employee-id="${assignment.employeeId}"][data-date="${assignment.date}"][data-assignment-layer="${layer}"]`
                );

                if (cell) {
                    applyShiftToCell(cell, assignment);
                }
            });

            updateAllSummaries();
        })
        .catch(error => console.error("Hiba a beosztások betöltésénél:", error));
}

/* ---------- Shift picker option display ---------- */

function initializeShiftPickerOptions() {
    document.querySelectorAll(".shift-picker-option").forEach(option => {
        if (option.dataset.clear === "true") {
            option.textContent = "Üres";
            option.classList.add("picker-clear");
            return;
        }

        const assignmentPreview = {
            shiftCode: option.dataset.code,
            hours: Number(option.dataset.hours),
            night: option.dataset.night === "true",
            standby: option.dataset.standby === "true",
            homeOffice: option.dataset.homeOffice === "true",
            shiftDescription: option.dataset.description || ""
        };

        option.textContent = formatCellText(assignmentPreview);

        option.classList.remove(
            "picker-normal",
            "picker-night",
            "picker-standby",
            "picker-standby-night",
            "picker-vacation",
            "picker-unavailable",
            "picker-layer-normal",
            "picker-layer-standby"
        );

        option.classList.add(getPickerClass(assignmentPreview));

        if (assignmentPreview.standby) {
            option.classList.add("picker-layer-standby");
        } else {
            option.classList.add("picker-layer-normal");
        }

        option.title = buildShiftTitle(assignmentPreview);
    });
}

function getPickerClass(assignment) {
    const shiftCode = (assignment.shiftCode || "").toUpperCase();

    if (shiftCode === "SZ") {
        return "picker-vacation";
    }

    if (shiftCode === "-") {
        return "picker-unavailable";
    }

    if (assignment.standby && assignment.night) {
        return "picker-standby-night";
    }

    if (assignment.standby) {
        return "picker-standby";
    }

    if (assignment.night) {
        return "picker-night";
    }

    return "picker-normal";
}

/* ---------- Hide / restore summary columns ---------- */

const hiddenSummaryColumnsStorageKey = "scheduler-hidden-summary-columns";

function getHiddenSummaryColumns() {
    const rawValue = localStorage.getItem(hiddenSummaryColumnsStorageKey);

    if (!rawValue) {
        return [];
    }

    try {
        const parsedValue = JSON.parse(rawValue);

        if (Array.isArray(parsedValue)) {
            return parsedValue;
        }

        return [];
    } catch (error) {
        return [];
    }
}

function saveHiddenSummaryColumns(hiddenColumns) {
    localStorage.setItem(hiddenSummaryColumnsStorageKey, JSON.stringify(hiddenColumns));
}

function hideSummaryColumn(columnName) {
    const hiddenColumns = getHiddenSummaryColumns();

    if (!hiddenColumns.includes(columnName)) {
        hiddenColumns.push(columnName);
    }

    saveHiddenSummaryColumns(hiddenColumns);
    applySummaryColumnVisibility();
}

function restoreSummaryColumn(columnName) {
    const hiddenColumns = getHiddenSummaryColumns()
        .filter(hiddenColumnName => hiddenColumnName !== columnName);

    saveHiddenSummaryColumns(hiddenColumns);
    applySummaryColumnVisibility();
}

function applySummaryColumnVisibility() {
    const hiddenColumns = getHiddenSummaryColumns();
    const toolbar = document.querySelector(".summary-column-toolbar");

    document.querySelectorAll("[data-summary-column]").forEach(element => {
        const columnName = element.dataset.summaryColumn;
        element.classList.toggle("summary-column-hidden", hiddenColumns.includes(columnName));
    });

    document.querySelectorAll("[data-summary-restore]").forEach(button => {
        const columnName = button.dataset.summaryRestore;
        button.classList.toggle("visible", hiddenColumns.includes(columnName));
    });

    if (toolbar) {
        toolbar.classList.toggle("has-hidden-summary-columns", hiddenColumns.length > 0);
    }
}

document.addEventListener("click", event => {
    const hideButton = event.target.closest("[data-summary-hide]");

    if (hideButton) {
        event.preventDefault();
        event.stopPropagation();

        hideSummaryColumn(hideButton.dataset.summaryHide);
        return;
    }

    const restoreButton = event.target.closest("[data-summary-restore]");

    if (restoreButton) {
        event.preventDefault();
        event.stopPropagation();

        restoreSummaryColumn(restoreButton.dataset.summaryRestore);
    }
});

/* ---------- Row highlight by employee name ---------- */

document.addEventListener("click", event => {
    const employeeNameCell = event.target.closest(".employee-name-cell");

    if (!employeeNameCell) {
        return;
    }

    const row = employeeNameCell.closest("tr");
    const employeeId = row.dataset.rowEmployeeId;
    const alreadyHighlighted = row.classList.contains("highlighted-row");

    document.querySelectorAll(".schedule-table tbody tr.highlighted-row").forEach(highlightedRow => {
        highlightedRow.classList.remove("highlighted-row");
    });

    if (!alreadyHighlighted) {
        document
            .querySelectorAll(`.schedule-table tbody tr[data-row-employee-id="${employeeId}"]`)
            .forEach(employeeRow => {
                employeeRow.classList.add("highlighted-row");
            });
    }
});

initializeShiftPickerOptions();
applySummaryColumnVisibility();

/* ---------- Hide / restore left sticky columns ---------- */

const hiddenLeftColumnsStorageKey = "scheduler-hidden-left-columns";

function getHiddenLeftColumns() {
    const rawValue = localStorage.getItem(hiddenLeftColumnsStorageKey);

    if (!rawValue) {
        return [];
    }

    try {
        const parsedValue = JSON.parse(rawValue);

        if (Array.isArray(parsedValue)) {
            return parsedValue;
        }

        return [];
    } catch (error) {
        return [];
    }
}

function saveHiddenLeftColumns(hiddenColumns) {
    localStorage.setItem(hiddenLeftColumnsStorageKey, JSON.stringify(hiddenColumns));
}

function hideLeftColumn(columnName) {
    const hiddenColumns = getHiddenLeftColumns();

    if (!hiddenColumns.includes(columnName)) {
        hiddenColumns.push(columnName);
    }

    saveHiddenLeftColumns(hiddenColumns);
    applyLeftColumnVisibility();
}

function restoreLeftColumn(columnName) {
    const hiddenColumns = getHiddenLeftColumns()
        .filter(hiddenColumnName => hiddenColumnName !== columnName);

    saveHiddenLeftColumns(hiddenColumns);
    applyLeftColumnVisibility();
}

function applyLeftColumnVisibility() {
    const hiddenColumns = getHiddenLeftColumns();
    const toolbar = document.querySelector(".summary-column-toolbar");
    const table = document.querySelector(".schedule-table");

    document.querySelectorAll("[data-left-column]").forEach(element => {
        const columnName = element.dataset.leftColumn;
        element.classList.toggle("left-column-hidden", hiddenColumns.includes(columnName));
    });

    document.querySelectorAll("[data-left-restore]").forEach(button => {
        const columnName = button.dataset.leftRestore;
        button.classList.toggle("visible", hiddenColumns.includes(columnName));
    });

    if (table) {
        table.classList.toggle("left-name-hidden", hiddenColumns.includes("name"));
        table.classList.toggle("left-skills-hidden", hiddenColumns.includes("skills"));
        table.classList.toggle("left-vacation-hidden", hiddenColumns.includes("vacation"));
    }

    if (toolbar) {
        const hiddenSummaryColumns = getHiddenSummaryColumns();
        const hasHiddenColumns = hiddenColumns.length > 0 || hiddenSummaryColumns.length > 0;

        toolbar.classList.toggle("has-hidden-summary-columns", hasHiddenColumns);
    }
}

document.addEventListener("click", event => {
    const hideButton = event.target.closest("[data-left-hide]");

    if (hideButton) {
        event.preventDefault();
        event.stopPropagation();

        hideLeftColumn(hideButton.dataset.leftHide);
        return;
    }

    const restoreButton = event.target.closest("[data-left-restore]");

    if (restoreButton) {
        event.preventDefault();
        event.stopPropagation();

        restoreLeftColumn(restoreButton.dataset.leftRestore);
    }
});

document.querySelectorAll(".assignment-cell").forEach(clearCell);

loadAssignments();

/* ---------- Month picker ---------- */

const monthPicker = document.querySelector(".month-picker");

if (monthPicker) {
    const monthPickerButton = document.getElementById("monthPickerButton");
    const pickerPreviousYear = document.getElementById("pickerPreviousYear");
    const pickerNextYear = document.getElementById("pickerNextYear");
    const pickerYear = document.getElementById("pickerYear");
    const monthButtons = document.querySelectorAll(".month-picker-grid button");

    const currentYear = Number(monthPicker.dataset.currentYear);
    const currentMonth = Number(monthPicker.dataset.currentMonth);

    let selectedYear = currentYear;

    updateSelectedMonth();

    monthPickerButton.addEventListener("click", event => {
        event.stopPropagation();
        monthPicker.classList.toggle("open");
    });

    pickerPreviousYear.addEventListener("click", event => {
        event.stopPropagation();
        selectedYear--;
        pickerYear.textContent = selectedYear;
        updateSelectedMonth();
    });

    pickerNextYear.addEventListener("click", event => {
        event.stopPropagation();
        selectedYear++;
        pickerYear.textContent = selectedYear;
        updateSelectedMonth();
    });

    monthButtons.forEach(button => {
        button.addEventListener("click", () => {
            const selectedMonth = button.dataset.month;
            window.location.href = `/?year=${selectedYear}&month=${selectedMonth}`;
        });
    });

    document.addEventListener("click", event => {
        if (!monthPicker.contains(event.target)) {
            monthPicker.classList.remove("open");
        }
    });

    function updateSelectedMonth() {
        monthButtons.forEach(button => {
            const buttonMonth = Number(button.dataset.month);

            if (selectedYear === currentYear && buttonMonth === currentMonth) {
                button.classList.add("selected-month");
            } else {
                button.classList.remove("selected-month");
            }
        });
    }
}

/* ---------- Hide / restore left sticky columns - safe init ---------- */

const schedulerHiddenLeftColumnsKey = "scheduler-hidden-left-columns-v2";

function schedulerGetHiddenLeftColumns() {
    const rawValue = localStorage.getItem(schedulerHiddenLeftColumnsKey);

    if (!rawValue) {
        return [];
    }

    try {
        const parsedValue = JSON.parse(rawValue);

        if (Array.isArray(parsedValue)) {
            return parsedValue;
        }

        return [];
    } catch (error) {
        return [];
    }
}

function schedulerSaveHiddenLeftColumns(hiddenColumns) {
    localStorage.setItem(schedulerHiddenLeftColumnsKey, JSON.stringify(hiddenColumns));
}

function schedulerApplyLeftColumnVisibility() {
    const hiddenColumns = schedulerGetHiddenLeftColumns();
    const toolbar = document.querySelector(".summary-column-toolbar");
    const table = document.querySelector(".schedule-table");

    document.querySelectorAll("[data-left-column]").forEach(element => {
        const columnName = element.dataset.leftColumn;
        element.classList.toggle("left-column-hidden", hiddenColumns.includes(columnName));
    });

    document.querySelectorAll("[data-left-restore]").forEach(button => {
        const columnName = button.dataset.leftRestore;
        button.classList.toggle("visible", hiddenColumns.includes(columnName));
    });

    if (table) {
        table.classList.toggle("left-name-hidden", hiddenColumns.includes("name"));
        table.classList.toggle("left-skills-hidden", hiddenColumns.includes("skills"));
        table.classList.toggle("left-vacation-hidden", hiddenColumns.includes("vacation"));
    }

    if (toolbar) {
        const hiddenSummaryColumns = getHiddenSummaryColumns();
        const hasHiddenColumns = hiddenColumns.length > 0 || hiddenSummaryColumns.length > 0;

        toolbar.classList.toggle("has-hidden-summary-columns", hasHiddenColumns);
    }
}

function schedulerHideLeftColumn(columnName) {
    const hiddenColumns = schedulerGetHiddenLeftColumns();

    if (!hiddenColumns.includes(columnName)) {
        hiddenColumns.push(columnName);
    }

    schedulerSaveHiddenLeftColumns(hiddenColumns);
    schedulerApplyLeftColumnVisibility();
}

function schedulerRestoreLeftColumn(columnName) {
    const hiddenColumns = schedulerGetHiddenLeftColumns()
        .filter(hiddenColumnName => hiddenColumnName !== columnName);

    schedulerSaveHiddenLeftColumns(hiddenColumns);
    schedulerApplyLeftColumnVisibility();
}

document.addEventListener("click", event => {
    const hideButton = event.target.closest("[data-left-hide]");

    if (hideButton) {
        event.preventDefault();
        event.stopPropagation();

        schedulerHideLeftColumn(hideButton.dataset.leftHide);
        return;
    }

    const restoreButton = event.target.closest("[data-left-restore]");

    if (restoreButton) {
        event.preventDefault();
        event.stopPropagation();

        schedulerRestoreLeftColumn(restoreButton.dataset.leftRestore);
    }
});

schedulerApplyLeftColumnVisibility();

/* ---------- Holiday dropdown handling ---------- */

function closeAllHolidayDropdowns() {
    document.querySelectorAll(".day-header.holiday-dropdown-open").forEach(header => {
        header.classList.remove("holiday-dropdown-open");
    });
}

document.addEventListener("click", event => {
    const dayHeaderButton = event.target.closest(".day-header-button");

    if (dayHeaderButton) {
        event.preventDefault();
        event.stopPropagation();

        const header = dayHeaderButton.closest(".day-header");
        const wasOpen = header.classList.contains("holiday-dropdown-open");

        closeAllHolidayDropdowns();

        if (!wasOpen) {
            header.classList.add("holiday-dropdown-open");
        }

        return;
    }

    const holidayToggleButton = event.target.closest(".day-holiday-toggle-button");

    if (holidayToggleButton) {
        event.preventDefault();
        event.stopPropagation();

        fetch("/special-days/toggle-holiday", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                date: holidayToggleButton.dataset.date
            })
        })
            .then(response => response.text())
            .then(result => {
                if (result === "OK") {
                    window.location.reload();
                } else {
                    alert("Nem sikerült módosítani a piros betűs napot.");
                }
            })
            .catch(error => console.error("Hiba a piros betűs nap módosításánál:", error));

        return;
    }

    closeAllHolidayDropdowns();
});