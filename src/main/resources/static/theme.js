/* ---------- Shared theme handling ---------- */

const schedulerThemeStorageKey = "scheduler-theme";
const colorfulThemeClass = "theme-colorful";

function applySchedulerTheme() {
    const savedTheme = localStorage.getItem(schedulerThemeStorageKey);
    const themeToggleButton = document.getElementById("themeToggleButton");

    const colorfulThemeEnabled = savedTheme === "colorful";

    document.body.classList.toggle(colorfulThemeClass, colorfulThemeEnabled);

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

applySchedulerTheme();