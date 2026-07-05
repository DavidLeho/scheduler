package com.pufi.scheduler;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;

@Entity
public class SpecialDay {

    public static final String TYPE_NORMAL = "NORMAL";
    public static final String TYPE_HOLIDAY = "HOLIDAY";
    public static final String TYPE_WORKING_DAY = "WORKING_DAY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String specialDate;

    private String name;

    private String dayType;

    public SpecialDay() {
    }

    public SpecialDay(String specialDate, String name, String dayType) {
        this.specialDate = specialDate;
        this.name = name;
        this.dayType = dayType;
    }

    public Long getId() {
        return id;
    }

    public String getSpecialDate() {
        return specialDate;
    }

    public String getName() {
        return name;
    }

    public String getDayType() {
        return dayType;
    }

    public boolean isHoliday() {
        return TYPE_HOLIDAY.equals(dayType);
    }

    public boolean isWorkingDay() {
        return TYPE_WORKING_DAY.equals(dayType);
    }

    public void setSpecialDate(String specialDate) {
        this.specialDate = specialDate;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setDayType(String dayType) {
        this.dayType = dayType;
    }
}
