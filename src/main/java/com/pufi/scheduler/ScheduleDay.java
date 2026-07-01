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

    public ScheduleDay(LocalDate date, boolean currentMonth) {
        this.date = date;
        this.dayNumber = date.getDayOfMonth();
        this.dayNameShort = date.getDayOfWeek()
                .getDisplayName(TextStyle.SHORT, Locale.forLanguageTag("hu-HU"));
        this.currentMonth = currentMonth;
        this.weekend = date.getDayOfWeek().getValue() >= 6;
        this.today = date.equals(LocalDate.now());
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
}