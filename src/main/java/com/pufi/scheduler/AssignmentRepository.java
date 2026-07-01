package com.pufi.scheduler;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    Optional<Assignment> findByEmployeeAndAssignmentDateAndAssignmentLayer(
            Employee employee,
            String assignmentDate,
            String assignmentLayer
    );

    List<Assignment> findByEmployee(Employee employee);
}