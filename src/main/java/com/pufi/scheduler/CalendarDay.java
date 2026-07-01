package com.pufi.scheduler;

import java.time.LocalDate;

public class CalendarDay {
    private final LocalDate date;
    private final Integer dayNumber;
    private final boolean empty;

    public CalendarDay(LocalDate date, Integer dayNumber, boolean empty) {
        this.date = date;
        this.dayNumber = dayNumber;
        this.empty = empty;
    }

    public static CalendarDay empty() {
        return new CalendarDay(null, null, true);
    }

    public static CalendarDay of(LocalDate date) {
        return new CalendarDay(date, date.getDayOfMonth(), false);
    }

    public LocalDate getDate() {
        return date;
    }

    public Integer getDayNumber() {
        return dayNumber;
    }

    public boolean isEmpty() {
        return empty;
    }
}