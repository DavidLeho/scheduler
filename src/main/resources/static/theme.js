/* ---------- Shared theme handling ---------- */

const schedulerThemeStorageKey = "scheduler-theme";
const schedulerPaletteStorageKey = "scheduler-theme-palette";
const colorfulThemeClass = "theme-colorful";
const themePaletteSelect = document.getElementById("themePalette");

function applySchedulerTheme() {
    const savedTheme = localStorage.getItem(schedulerThemeStorageKey);
    const themeToggleButton = document.getElementById("themeToggleButton");

    const colorfulThemeEnabled = savedTheme === "colorful";
    const palette = localStorage.getItem(schedulerPaletteStorageKey) || "rainbow";

    document.body.classList.toggle(colorfulThemeClass, colorfulThemeEnabled);
    document.body.dataset.themePalette = palette;

    if (themePaletteSelect) {
        themePaletteSelect.value = palette;
        if (themePaletteSelect.selectedIndex < 0) {
            themePaletteSelect.value = "rainbow";
        }
        themePaletteSelect.hidden = !colorfulThemeEnabled;
    }

    if (themeToggleButton) {
        themeToggleButton.classList.toggle("active", colorfulThemeEnabled);
        themeToggleButton.setAttribute("aria-pressed", colorfulThemeEnabled ? "true" : "false");
    }
}

function toggleSchedulerTheme() {
    const colorfulThemeEnabled = document.body.classList.contains(colorfulThemeClass);

    if (colorfulThemeEnabled) {
        localStorage.setItem(schedulerThemeStorageKey, "default");
    } else {
        localStorage.setItem(schedulerThemeStorageKey, "colorful");
    }

    applySchedulerTheme();
}

document.addEventListener("click", event => {
    const themeToggleButton = event.target.closest("#themeToggleButton");

    if (!themeToggleButton) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    toggleSchedulerTheme();
});

themePaletteSelect?.addEventListener("change", () => {
    localStorage.setItem(schedulerPaletteStorageKey, themePaletteSelect.value);
    applySchedulerTheme();
});

applySchedulerTheme();
