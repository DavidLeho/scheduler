package com.pufi.scheduler;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

@Entity
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private int vacationHours;

    @ElementCollection
    private List<String> skills = new ArrayList<>();

    public Employee() {
    }

    public Employee(String name, List<String> skills, int vacationHours) {
        this.name = name;
        this.skills = new ArrayList<>(skills);
        this.vacationHours = vacationHours;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public int getVacationHours() {
        return vacationHours;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setVacationHours(int vacationHours) {
        this.vacationHours = vacationHours;
    }

    public void setSkills(List<String> skills) {
        this.skills = new ArrayList<>(skills);
    }

    public void removeSkill(String skill) {
        skills.remove(skill);
    }

    public String getSkillsText() {
        StringJoiner joiner = new StringJoiner(",");

        for (String skill : skills) {
            joiner.add(skill);
        }

        return joiner.toString();
    }

    public String getSkillsDisplayText() {
        if (skills.isEmpty()) {
            return "-";
        }

        StringJoiner joiner = new StringJoiner("/");

        for (String skill : skills) {
            joiner.add(skill);
        }

        return joiner.toString();
    }
}