package com.pufi.scheduler;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ShiftTypeRepository extends JpaRepository<ShiftType, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select shift from ShiftType shift where shift.id = :id")
    Optional<ShiftType> findByIdForScheduling(@Param("id") Long id);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    Optional<ShiftType> findByCodeIgnoreCase(String code);
}
