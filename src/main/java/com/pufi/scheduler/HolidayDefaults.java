package com.pufi.scheduler;

import java.time.LocalDate;
import java.time.MonthDay;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

public final class HolidayDefaults {

    private HolidayDefaults() {
    }

    public static Map<LocalDate, String> getFixedHolidaysForYear(int year) {
        Map<LocalDate, String> holidays = new LinkedHashMap<>();

        holidays.put(LocalDate.of(year, 1, 1), "Újév");
        holidays.put(LocalDate.of(year, 3, 15), "Március 15.");
        holidays.put(LocalDate.of(year, 5, 1), "Munka ünnepe");
        holidays.put(LocalDate.of(year, 8, 20), "Augusztus 20.");
        holidays.put(LocalDate.of(year, 10, 23), "Október 23.");
        holidays.put(LocalDate.of(year, 11, 1), "Mindenszentek");
        holidays.put(LocalDate.of(year, 12, 25), "Karácsony");
        holidays.put(LocalDate.of(year, 12, 26), "Karácsony másnapja");

        return holidays;
    }

    public static Optional<String> getFixedHolidayName(LocalDate date) {
        Map<MonthDay, String> fixedHolidays = new LinkedHashMap<>();

        fixedHolidays.put(MonthDay.of(1, 1), "Újév");
        fixedHolidays.put(MonthDay.of(3, 15), "Március 15.");
        fixedHolidays.put(MonthDay.of(5, 1), "Munka ünnepe");
        fixedHolidays.put(MonthDay.of(8, 20), "Augusztus 20.");
        fixedHolidays.put(MonthDay.of(10, 23), "Október 23.");
        fixedHolidays.put(MonthDay.of(11, 1), "Mindenszentek");
        fixedHolidays.put(MonthDay.of(12, 25), "Karácsony");
        fixedHolidays.put(MonthDay.of(12, 26), "Karácsony másnapja");

        return Optional.ofNullable(fixedHolidays.get(MonthDay.from(date)));
    }
}