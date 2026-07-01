/* ---------- Schedule table assignment handling ---------- */

function closeAllPickers() {
    document.querySelectorAll(".schedule-cell.open").forEach(cell => {
        cell.classList.remove("open");
    });
}

document.addEventListener("click", event => {
    const displayButton = event.target.closest(".schedule-cell-display");
    const pickerOption = event.target.closest(".shift-picker-option");

    if (displayButton) {
        event.stopPropagation();

        const cell = displayButton.closest(".schedule-cell");
        const wasOpen = cell.classList.contains("open");

        closeAllPickers();

        if (!wasOpen) {
            cell.classList.add("open");
        }

        return;
    }

    if (pickerOption) {
        event.stopPropagation();

        const cell = pickerOption.closest(".schedule-cell");

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
                    hours: Number(option.dataset.hours),
                    night: option.dataset.night === "true",
                    standby: option.dataset.standby === "true",
                    homeOffice: option.dataset.homeOffice === "true",
                    shiftDescription: option.dataset.description || ""
                });
            } else if (result === "EMPLOYEE_NOT_FOUND") {
                alert("Nem találom ezt a dolgozót az adatbázisban.");
            } else if (result === "SHIFT_TYPE_NOT_FOUND") {
                alert("Nem találom ezt a műszakot az adatbázisban.");
            } else {
                alert("Nem sikerült menteni a beosztást.");
            }
        })
        .catch(error => console.error("Hiba a beosztás mentésénél:", error));
}

function deleteAssignmentFromCell(cell) {
    const params = new URLSearchParams({
        employeeId: cell.dataset.employeeId,
        date: cell.dataset.date
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
        "shift-vacation"
    );

    display.classList.add(getShiftClass(assignment));

    display.title = buildShiftTitle(assignment);

    cell.dataset.shiftTypeId = assignment.shiftTypeId;
    cell.dataset.shiftCode = assignment.shiftCode;
    cell.dataset.hours = assignment.hours;
    cell.dataset.night = assignment.night;
    cell.dataset.standby = assignment.standby;
    cell.dataset.homeOffice = assignment.homeOffice;

    updateRowSummary(cell.closest("tr"));
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
        "shift-vacation"
    );

    display.classList.add("empty-cell");

    delete cell.dataset.shiftTypeId;
    delete cell.dataset.shiftCode;
    delete cell.dataset.hours;
    delete cell.dataset.night;
    delete cell.dataset.standby;
    delete cell.dataset.homeOffice;

    updateRowSummary(cell.closest("tr"));
}

function formatCellText(assignment) {
    if (assignment.shiftCode && assignment.shiftCode.toUpperCase() === "SZ") {
        return "SZ";
    }

    const hoursText = formatHours(assignment.hours);

    if (assignment.homeOffice) {
        return hoursText + "HO";
    }

    return hoursText;
}

function getShiftClass(assignment) {
    if (assignment.shiftCode && assignment.shiftCode.toUpperCase() === "SZ") {
        return "shift-vacation";
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
    if (assignment.shiftCode && assignment.shiftCode.toUpperCase() === "SZ") {
        return "SZ - Szabadság - 8 óra";
    }

    const parts = [];

    if (assignment.shiftCode) {
        parts.push(assignment.shiftCode);
    }

    parts.push(`${formatHours(assignment.hours)} óra`);

    parts.push(assignment.night ? "éjszakai" : "nappali");
    parts.push(assignment.standby ? "készenlét" : "normál");
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

function updateRowSummary(row) {
    if (!row) {
        return;
    }

    let totalHours = 0;
    let nightHours = 0;
    let standbyHours = 0;
    let homeOfficeHours = 0;
    let vacationUsedHours = 0;

    const vacationBaseHours = Number(row.dataset.vacationHours || 0);
    const cells = row.querySelectorAll(".schedule-cell");

    cells.forEach(cell => {
        if (cell.dataset.currentMonth !== "true") {
            return;
        }

        const hours = Number(cell.dataset.hours);

        if (Number.isNaN(hours)) {
            return;
        }

        const shiftCode = (cell.dataset.shiftCode || "").toUpperCase();

        if (shiftCode === "SZ") {
            vacationUsedHours += hours;
            return;
        }

        totalHours += hours;

        if (cell.dataset.night === "true") {
            nightHours += hours;
        }

        if (cell.dataset.standby === "true") {
            standbyHours += hours;
        }

        if (cell.dataset.homeOffice === "true") {
            homeOfficeHours += hours;
        }
    });

    const vacationRemainingHours = vacationBaseHours - vacationUsedHours;

    row.querySelector(".row-total-hours").textContent = formatHours(totalHours);
    row.querySelector(".row-night-hours").textContent = formatHours(nightHours);
    row.querySelector(".row-standby-hours").textContent = formatHours(standbyHours);
    row.querySelector(".row-ho-hours").textContent = formatHours(homeOfficeHours);

    const vacationCell = row.querySelector(".vacation-cell");
    vacationCell.textContent = formatHours(vacationRemainingHours);

    vacationCell.classList.remove("vacation-negative", "vacation-low");

    if (vacationRemainingHours < 0) {
        vacationCell.classList.add("vacation-negative");
    } else if (vacationRemainingHours <= 16) {
        vacationCell.classList.add("vacation-low");
    }
}

function updateAllSummaries() {
    document.querySelectorAll(".schedule-table tbody tr").forEach(updateRowSummary);
}

function loadAssignments() {
    fetch("/assignments")
        .then(response => response.json())
        .then(assignments => {
            assignments.forEach(assignment => {
                const cell = document.querySelector(
                    `.schedule-cell[data-employee-id="${assignment.employeeId}"][data-date="${assignment.date}"]`
                );

                if (cell) {
                    applyShiftToCell(cell, assignment);
                }
            });

            updateAllSummaries();
        })
        .catch(error => console.error("Hiba a beosztások betöltésénél:", error));
}

document.querySelectorAll(".schedule-cell").forEach(clearCell);

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