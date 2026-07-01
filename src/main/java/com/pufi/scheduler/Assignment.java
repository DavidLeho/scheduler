package com.pufi.scheduler;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class Assignment {

    public static final String LAYER_NORMAL = "NORMAL";
    public static final String LAYER_STANDBY = "STANDBY";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private Employee employee;

    private String assignmentDate;

    private String assignmentLayer;

    @ManyToOne
    @JoinColumn(name = "shift_type_id")
    private ShiftType shiftType;

    public Assignment() {
    }

    public Assignment(Employee employee, String assignmentDate, String assignmentLayer, ShiftType shiftType) {
        this.employee = employee;
        this.assignmentDate = assignmentDate;
        this.assignmentLayer = assignmentLayer;
        this.shiftType = shiftType;
    }

    public Long getId() {
        return id;
    }

    public Long getEmployeeId() {
        if (employee == null) {
            return null;
        }

        return employee.getId();
    }

    public String getEmployeeName() {
        if (employee == null) {
            return "";
        }

        return employee.getName();
    }

    public String getDate() {
        return assignmentDate;
    }

    public String getAssignmentLayer() {
        if (assignmentLayer == null || assignmentLayer.isBlank()) {
            return LAYER_NORMAL;
        }

        return assignmentLayer;
    }

    public Long getShiftTypeId() {
        if (shiftType == null) {
            return null;
        }

        return shiftType.getId();
    }

    public String getShiftCode() {
        if (shiftType == null) {
            return "";
        }

        return shiftType.getCode();
    }

    public double getHours() {
        if (shiftType == null) {
            return 0;
        }

        return shiftType.getHours();
    }

    public boolean isNight() {
        return shiftType != null && shiftType.isNight();
    }

    public boolean isStandby() {
        return shiftType != null && shiftType.isStandby();
    }

    public boolean isHomeOffice() {
        return shiftType != null && shiftType.isHomeOffice();
    }

    public String getShiftDescription() {
        if (shiftType == null) {
            return "";
        }

        return shiftType.getDescription();
    }

    public String getShiftDisplayText() {
        if (shiftType == null) {
            return "";
        }

        return shiftType.getHours() + "";
    }
}