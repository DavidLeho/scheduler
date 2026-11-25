package com.pufi.scheduler;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static com.pufi.scheduler.Assignment.LAYER_NORMAL;
import static com.pufi.scheduler.Assignment.LAYER_STANDBY;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.flash;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:scheduler-test",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class AssignmentIntegrationTests {

    private static final String LAST_DAY_OF_MONTH = "2026-11-30";
    private static final String FIRST_DAY_OF_NEXT_MONTH = "2026-12-01";
    private static final String SECOND_DAY_OF_NEXT_MONTH = "2026-12-02";

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private EmployeeRepository employees;
    @Autowired
    private ShiftTypeRepository shiftTypes;
    @Autowired
    private AssignmentRepository assignments;

    private MockMvc mvc;
    private Employee employee;
    private ShiftType normal;
    private ShiftType alternate;
    private ShiftType standby;
    private ShiftType twentyFourHours;
    private ShiftType unavailable;
    private ShiftType vacation;

    @BeforeEach
    void setUp() {
        mvc = webAppContextSetup(context).build();
        employee = employees.save(new Employee("Test employee", List.of(), 0));
        normal = shift("NORMAL", 8, false);
        alternate = shift("ALTERNATE", 12, false);
        standby = shift("STANDBY", 8, true);
        twentyFourHours = shift("24H", 24, false);
        unavailable = shiftTypes.findByCodeIgnoreCase("-").orElseThrow();
        vacation = shiftTypes.findByCodeIgnoreCase("SZ").orElseThrow();
    }

    @Test
    void updatesNormalAssignmentInPlaceAndKeepsStandbySeparate() throws Exception {
        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, normal, "CREATED");
        save(LAST_DAY_OF_MONTH, LAYER_STANDBY, standby, "CREATED");
        Long normalId = assignment(LAST_DAY_OF_MONTH, LAYER_NORMAL).getId();
        Long standbyId = assignment(LAST_DAY_OF_MONTH, LAYER_STANDBY).getId();

        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, alternate, "UPDATED");

        Assignment updated = assignment(LAST_DAY_OF_MONTH, LAYER_NORMAL);
        assertEquals(normalId, updated.getId());
        assertEquals(alternate.getId(), updated.getShiftTypeId());
        assertEquals(standbyId, assignment(LAST_DAY_OF_MONTH, LAYER_STANDBY).getId());
        assertEquals(standby.getId(), assignment(LAST_DAY_OF_MONTH, LAYER_STANDBY).getShiftTypeId());

        remove(LAST_DAY_OF_MONTH, LAYER_STANDBY);

        assertEquals(normalId, assignment(LAST_DAY_OF_MONTH, LAYER_NORMAL).getId());
        assertEquals(1, assignments.findByEmployee(employee).size());
    }

    @Test
    void rejectsShiftTypesInTheWrongLayer() throws Exception {
        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, standby, "STANDBY_ONLY_ALLOWED_IN_STANDBY_ROW");
        save(LAST_DAY_OF_MONTH, LAYER_STANDBY, normal, "NORMAL_ONLY_ALLOWED_IN_NORMAL_ROW");
        assertTrue(assignments.findByEmployee(employee).isEmpty());
    }

    @Test
    void protectsBothDaysOfTheNextMonthAndUnlocksAfterShortening() throws Exception {
        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, twentyFourHours, "CREATED");

        for (String date : List.of(FIRST_DAY_OF_NEXT_MONTH, SECOND_DAY_OF_NEXT_MONTH)) {
            save(date, LAYER_NORMAL, normal, "REST_REQUIRED_AFTER_24H|2026-11-30|NORMAL");
            save(date, LAYER_STANDBY, standby, "REST_REQUIRED_AFTER_24H|2026-11-30|NORMAL");
        }
        save(FIRST_DAY_OF_NEXT_MONTH, LAYER_NORMAL, unavailable, "CREATED");
        save(SECOND_DAY_OF_NEXT_MONTH, LAYER_NORMAL, vacation, "CREATED");

        assertEquals(unavailable.getId(), assignment(FIRST_DAY_OF_NEXT_MONTH, LAYER_NORMAL).getShiftTypeId());
        assertEquals(vacation.getId(), assignment(SECOND_DAY_OF_NEXT_MONTH, LAYER_NORMAL).getShiftTypeId());
        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, normal, "UPDATED");
        save(FIRST_DAY_OF_NEXT_MONTH, LAYER_NORMAL, normal, "UPDATED");
        save(SECOND_DAY_OF_NEXT_MONTH, LAYER_STANDBY, standby, "CREATED");
    }

    @Test
    void rejectsUpdatingToTwentyFourHoursWhenTheNextMonthAlreadyHasWork() throws Exception {
        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, normal, "CREATED");
        save(FIRST_DAY_OF_NEXT_MONTH, LAYER_NORMAL, normal, "CREATED");
        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, twentyFourHours, "REST_CONFLICT_AFTER_24H|2026-12-01|NORMAL");
        assertEquals(normal.getId(), assignment(LAST_DAY_OF_MONTH, LAYER_NORMAL).getShiftTypeId());
        assertEquals(normal.getId(), assignment(FIRST_DAY_OF_NEXT_MONTH, LAYER_NORMAL).getShiftTypeId());

        save(FIRST_DAY_OF_NEXT_MONTH, LAYER_NORMAL, unavailable, "UPDATED");
        save(SECOND_DAY_OF_NEXT_MONTH, LAYER_NORMAL, vacation, "CREATED");
        save(SECOND_DAY_OF_NEXT_MONTH, LAYER_STANDBY, standby, "CREATED");
        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, twentyFourHours, "REST_CONFLICT_AFTER_24H|2026-12-02|STANDBY");
        assertEquals(normal.getId(), assignment(LAST_DAY_OF_MONTH, LAYER_NORMAL).getShiftTypeId());
        assertEquals(standby.getId(), assignment(SECOND_DAY_OF_NEXT_MONTH, LAYER_STANDBY).getShiftTypeId());

        remove(SECOND_DAY_OF_NEXT_MONTH, LAYER_STANDBY);
        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, twentyFourHours, "UPDATED");
        assertEquals(twentyFourHours.getId(), assignment(LAST_DAY_OF_MONTH, LAYER_NORMAL).getShiftTypeId());
        assertEquals(unavailable.getId(), assignment(FIRST_DAY_OF_NEXT_MONTH, LAYER_NORMAL).getShiftTypeId());
        assertEquals(vacation.getId(), assignment(SECOND_DAY_OF_NEXT_MONTH, LAYER_NORMAL).getShiftTypeId());
    }

    @Test
    void appliesToTwentyFourHourStandbyAcrossTheYearAndUnlocksAfterDeletion() throws Exception {
        ShiftType longStandby = shift("STANDBY-24H", 24, true);
        save("2026-12-31", LAYER_STANDBY, longStandby, "CREATED");

        save("2027-01-01", LAYER_STANDBY, standby, "REST_REQUIRED_AFTER_24H|2026-12-31|STANDBY");
        save("2027-01-02", LAYER_NORMAL, normal, "REST_REQUIRED_AFTER_24H|2026-12-31|STANDBY");
        save("2027-01-03", LAYER_NORMAL, normal, "CREATED");
        remove("2026-12-31", LAYER_STANDBY);

        save("2027-01-01", LAYER_NORMAL, normal, "CREATED");
        save("2027-01-02", LAYER_STANDBY, standby, "CREATED");
    }

    @Test
    void rejectsPromotingAUsedShiftTypeIfItsAssignmentsWouldCauseAConflict() throws Exception {
        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, normal, "CREATED");
        save(SECOND_DAY_OF_NEXT_MONTH, LAYER_STANDBY, standby, "CREATED");

        mvc.perform(post("/shift-types/update")
                        .param("id", normal.getId().toString()).param("code", normal.getCode())
                        .param("hours", "24").param("year", "2026").param("month", "11"))
                .andExpect(status().is3xxRedirection())
                .andExpect(flash().attribute("errorMessage", containsString("2026-12-02")));

        assertEquals(8, assignment(LAST_DAY_OF_MONTH, LAYER_NORMAL).getHours());
        assertEquals(standby.getId(), assignment(SECOND_DAY_OF_NEXT_MONTH, LAYER_STANDBY).getShiftTypeId());
    }

    @Test
    void leavesAnExistingSecondDayConflictInPlaceUntilExplicitDeletion() throws Exception {
        Assignment source = assignments.save(new Assignment(employee, LAST_DAY_OF_MONTH, LAYER_NORMAL, twentyFourHours));
        Assignment legacy = assignments.save(new Assignment(employee, SECOND_DAY_OF_NEXT_MONTH, LAYER_STANDBY, standby));

        mvc.perform(get("/assignments")).andExpect(status().isOk());
        save(SECOND_DAY_OF_NEXT_MONTH, LAYER_STANDBY, standby, "REST_REQUIRED_AFTER_24H|2026-11-30|NORMAL");
        assertEquals(legacy.getId(), assignment(SECOND_DAY_OF_NEXT_MONTH, LAYER_STANDBY).getId());

        remove(SECOND_DAY_OF_NEXT_MONTH, LAYER_STANDBY);
        assertEquals(source.getId(), assignment(LAST_DAY_OF_MONTH, LAYER_NORMAL).getId());
        assertEquals(1, assignments.findByEmployee(employee).size());
    }

    @Test
    void databaseRejectsDuplicateAssignmentsInEitherLayer() throws Exception {
        save(LAST_DAY_OF_MONTH, LAYER_NORMAL, normal, "CREATED");
        save(LAST_DAY_OF_MONTH, LAYER_STANDBY, standby, "CREATED");

        assertThrows(DataIntegrityViolationException.class, () -> assignments.saveAndFlush(
                new Assignment(employee, LAST_DAY_OF_MONTH, LAYER_NORMAL, alternate)));
        assertThrows(DataIntegrityViolationException.class, () -> assignments.saveAndFlush(
                new Assignment(employee, LAST_DAY_OF_MONTH, LAYER_STANDBY, standby)));
        assertEquals(2, assignments.findByEmployee(employee).size());
    }

    private ShiftType shift(String code, double hours, boolean isStandby) {
        return shiftTypes.save(new ShiftType("TEST-" + employee.getId() + "-" + code,
                hours, false, isStandby, false, ""));
    }

    private Assignment assignment(String date, String layer) {
        return assignments.findByEmployeeAndAssignmentDateAndAssignmentLayer(employee, date, layer).orElseThrow();
    }

    private void save(String date, String layer, ShiftType shift, String expected) throws Exception {
        mvc.perform(post("/assignments").contentType(MediaType.APPLICATION_JSON).content("""
                        {"employeeId": %d, "date": "%s", "assignmentLayer": "%s", "shiftTypeId": %d}
                        """.formatted(employee.getId(), date, layer, shift.getId())))
                .andExpect(status().isOk())
                .andExpect(content().string(expected));
    }

    private void remove(String date, String layer) throws Exception {
        mvc.perform(delete("/assignments").param("employeeId", employee.getId().toString())
                        .param("date", date).param("assignmentLayer", layer))
                .andExpect(status().isOk())
                .andExpect(content().string("OK"));
    }
}
