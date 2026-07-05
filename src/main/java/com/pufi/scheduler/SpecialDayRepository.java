package com.pufi.scheduler;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpecialDayRepository extends JpaRepository<SpecialDay, Long> {

    Optional<SpecialDay> findBySpecialDate(String specialDate);

    List<SpecialDay> findBySpecialDateIn(List<String> specialDates);
}