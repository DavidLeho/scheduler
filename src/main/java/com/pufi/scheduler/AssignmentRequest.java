package com.pufi.scheduler;

public class AssignmentRequest {

    private Long employeeId;
    private String date;
    private Long shiftTypeId;

    public Long getEmployeeId() {
        return employeeId;
    }

    public String getDate() {
        return date;
    }

    public Long getShiftTypeId() {
        return shiftTypeId;
    }

    public void setEmployeeId(Long employeeId) {
        this.employeeId = employeeId;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public void setShiftTypeId(Long shiftTypeId) {
        this.shiftTypeId = shiftTypeId;
    }
}