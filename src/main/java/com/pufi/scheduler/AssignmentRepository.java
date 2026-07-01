package com.pufi.scheduler;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    boolean existsByEmployeeAndAssignmentDate(
            Employee employee,
            String assignmentDate
    );

    Optional<Assignment> findByEmployeeAndAssignmentDate(
            Employee employee,
            String assignmentDate
    );

    List<Assignment> findByEmployee(Employee employee);
}