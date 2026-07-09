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

        holidays.putAll(getMovableHolidaysForYear(year));

        return holidays;
    }

    public static Optional<String> getFixedHolidayName(LocalDate date) {
        Optional<String> fixedHolidayName = getFixedDateHolidayName(date);

        if (fixedHolidayName.isPresent()) {
            return fixedHolidayName;
        }

        return getMovableHolidayName(date);
    }

    private static Optional<String> getFixedDateHolidayName(LocalDate date) {
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

    private static Map<LocalDate, String> getMovableHolidaysForYear(int year) {
        Map<LocalDate, String> holidays = new LinkedHashMap<>();

        LocalDate easterSunday = calculateEasterSunday(year);

        holidays.put(easterSunday.minusDays(2), "Nagypéntek");
        holidays.put(easterSunday.plusDays(1), "Húsvéthétfő");
        holidays.put(easterSunday.plusDays(50), "Pünkösdhétfő");

        return holidays;
    }

    private static Optional<String> getMovableHolidayName(LocalDate date) {
        LocalDate easterSunday = calculateEasterSunday(date.getYear());

        if (date.equals(easterSunday.minusDays(2))) {
            return Optional.of("Nagypéntek");
        }

        if (date.equals(easterSunday.plusDays(1))) {
            return Optional.of("Húsvéthétfő");
        }

        if (date.equals(easterSunday.plusDays(50))) {
            return Optional.of("Pünkösdhétfő");
        }

        return Optional.empty();
    }

    private static LocalDate calculateEasterSunday(int year) {
        int a = year % 19;
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;

        int month = (h + l - 7 * m + 114) / 31;
        int day = ((h + l - 7 * m + 114) % 31) + 1;

        return LocalDate.of(year, month, day);
    }
}