package com.pufi.scheduler;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class ShiftType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String code;

    private double hours;

    private boolean night;
    private boolean standby;
    private boolean homeOffice;

    private String description;

    public ShiftType() {
    }

    public ShiftType(
            String code,
            double hours,
            boolean night,
            boolean standby,
            boolean homeOffice,
            String description
    ) {
        this.code = code;
        this.hours = hours;
        this.night = night;
        this.standby = standby;
        this.homeOffice = homeOffice;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public double getHours() {
        return hours;
    }

    public boolean isNight() {
        return night;
    }

    public boolean isStandby() {
        return standby;
    }

    public boolean isHomeOffice() {
        return homeOffice;
    }

    public String getDescription() {
        if (description == null) {
            return "";
        }

        return description;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public void setHours(double hours) {
        this.hours = hours;
    }

    public void setNight(boolean night) {
        this.night = night;
    }

    public void setStandby(boolean standby) {
        this.standby = standby;
    }

    public void setHomeOffice(boolean homeOffice) {
        this.homeOffice = homeOffice;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDayText() {
        return night ? "éjszakai" : "nappali";
    }

    public String getStandbyText() {
        return standby ? "készenlét" : "normál";
    }

    public String getHomeOfficeText() {
        return homeOffice ? "HO" : "iroda";
    }
}