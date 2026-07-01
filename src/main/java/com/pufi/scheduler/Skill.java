package com.pufi.scheduler;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String name;

    private String description;

    public Skill() {
    }

    public Skill(String name) {
        this.name = name;
        this.description = "";
    }

    public Skill(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        if (description == null) {
            return "";
        }

        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}