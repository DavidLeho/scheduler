package com.pufi.scheduler;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShiftTypeRepository extends JpaRepository<ShiftType, Long> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    Optional<ShiftType> findByCodeIgnoreCase(String code);
}