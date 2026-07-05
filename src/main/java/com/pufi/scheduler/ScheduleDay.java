package com.pufi.scheduler;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.Locale;

public class ScheduleDay {

    private LocalDate date;
    private int dayNumber;
    private String dayNameShort;
    private boolean currentMonth;
    private boolean weekend;
    private boolean today;
    private boolean holiday;
    private String holidayName;

    public ScheduleDay(LocalDate date, boolean currentMonth) {
        this(date, currentMonth, null);
    }

    public ScheduleDay(LocalDate date, boolean currentMonth, SpecialDay specialDay) {
        this.date = date;
        this.dayNumber = date.getDayOfMonth();
        this.dayNameShort = date.getDayOfWeek()
                .getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("hu-HU"));
        this.currentMonth = currentMonth;
        this.weekend = date.getDayOfWeek().getValue() >= 6;
        this.today = date.equals(LocalDate.now());

        if (specialDay != null && specialDay.isHoliday()) {
            this.holiday = true;
            this.holidayName = specialDay.getName();
        } else {
            this.holiday = false;
            this.holidayName = "";
        }
    }

    public LocalDate getDate() {
        return date;
    }

    public int getDayNumber() {
        return dayNumber;
    }

    public String getDayNameShort() {
        return dayNameShort;
    }

    public boolean isCurrentMonth() {
        return currentMonth;
    }

    public boolean isWeekend() {
        return weekend;
    }

    public boolean isToday() {
        return today;
    }

    public boolean isHoliday() {
        return holiday;
    }

    public String getHolidayName() {
        return holidayName;
    }
}