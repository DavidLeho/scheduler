package com.pufi.scheduler;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Controller
public class CalendarController {

    private final EmployeeRepository employeeRepository;
    private final AssignmentRepository assignmentRepository;
    private final SkillRepository skillRepository;
    private final ShiftTypeRepository shiftTypeRepository;

    public CalendarController(
            EmployeeRepository employeeRepository,
            AssignmentRepository assignmentRepository,
            SkillRepository skillRepository,
            ShiftTypeRepository shiftTypeRepository
    ) {
        this.employeeRepository = employeeRepository;
        this.assignmentRepository = assignmentRepository;
        this.skillRepository = skillRepository;
        this.shiftTypeRepository = shiftTypeRepository;

        if (skillRepository.count() == 0) {
            skillRepository.save(new Skill("A", "entry fragger"));
            skillRepository.save(new Skill("B", "inas"));
            skillRepository.save(new Skill("C", "support"));
            skillRepository.save(new Skill("D", "backup"));
            skillRepository.save(new Skill("E", "joker"));
        }

        if (shiftTypeRepository.count() == 0) {
            shiftTypeRepository.save(new ShiftType("A", 12, false, false, false, "12 órás nappali műszak"));
            shiftTypeRepository.save(new ShiftType("B", 8, true, false, false, "8 órás éjszakai műszak"));
            shiftTypeRepository.save(new ShiftType("C", 12, false, true, true, "12 órás készenléti HO műszak"));
        }

        ensureSpecialShiftTypesExist();

        if (employeeRepository.count() == 0) {
            employeeRepository.save(new Employee("Anna", List.of("A", "B"), 160));
            employeeRepository.save(new Employee("Béla", List.of("A"), 144));
            employeeRepository.save(new Employee("Csaba", List.of("B", "C"), 120));
            employeeRepository.save(new Employee("Éva", List.of("C", "E"), 152));
        }
    }

    @GetMapping("/")
    public String calendar(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            Model model
    ) {
        YearMonth currentYearMonth;

        if (year == null || month == null) {
            currentYearMonth = YearMonth.now();
        } else {
            currentYearMonth = YearMonth.of(year, month);
        }

        int selectedYear = currentYearMonth.getYear();
        int selectedMonth = currentYearMonth.getMonthValue();

        String monthName = currentYearMonth
                .getMonth()
                .getDisplayName(TextStyle.FULL, Locale.forLanguageTag("hu-HU"));

        monthName = monthName.substring(0, 1).toUpperCase() + monthName.substring(1);

        YearMonth previousMonth = currentYearMonth.minusMonths(1);
        YearMonth nextMonth = currentYearMonth.plusMonths(1);

        model.addAttribute("year", selectedYear);
        model.addAttribute("month", selectedMonth);
        model.addAttribute("monthName", monthName);

        model.addAttribute("previousYear", previousMonth.getYear());
        model.addAttribute("previousMonth", previousMonth.getMonthValue());

        model.addAttribute("nextYear", nextMonth.getYear());
        model.addAttribute("nextMonth", nextMonth.getMonthValue());

        model.addAttribute("scheduleDays", createScheduleDays(currentYearMonth));
        model.addAttribute("employees", employeeRepository.findAll());
        model.addAttribute("shiftTypes", shiftTypeRepository.findAll());

        return "calendar";
    }

    @GetMapping("/manage")
    public String manage(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            Model model
    ) {
        YearMonth currentYearMonth;

        if (year == null || month == null) {
            currentYearMonth = YearMonth.now();
        } else {
            currentYearMonth = YearMonth.of(year, month);
        }

        model.addAttribute("year", currentYearMonth.getYear());
        model.addAttribute("month", currentYearMonth.getMonthValue());
        model.addAttribute("employees", employeeRepository.findAll());
        model.addAttribute("skills", getSkillNames());
        model.addAttribute("skillObjects", skillRepository.findAll());
        model.addAttribute("shiftTypes", shiftTypeRepository.findAll());
        model.addAttribute("manageableShiftTypes", getManageableShiftTypes());

        return "manage";
    }

    @PostMapping("/assignments")
    @ResponseBody
    public String createOrUpdateAssignment(@RequestBody AssignmentRequest request) {
        Employee employee = employeeRepository.findById(request.getEmployeeId()).orElse(null);

        if (employee == null) {
            return "EMPLOYEE_NOT_FOUND";
        }

        ShiftType shiftType = shiftTypeRepository.findById(request.getShiftTypeId()).orElse(null);

        if (shiftType == null) {
            return "SHIFT_TYPE_NOT_FOUND";
        }

        String requestedLayer = normalizeAssignmentLayer(request.getAssignmentLayer());

        if (shiftType.isStandby() && !Assignment.LAYER_STANDBY.equals(requestedLayer)) {
            return "STANDBY_ONLY_ALLOWED_IN_STANDBY_ROW";
        }

        if (!shiftType.isStandby() && !Assignment.LAYER_NORMAL.equals(requestedLayer)) {
            return "NORMAL_ONLY_ALLOWED_IN_NORMAL_ROW";
        }

        Assignment assignment = assignmentRepository
                .findByEmployeeAndAssignmentDateAndAssignmentLayer(
                        employee,
                        request.getDate(),
                        requestedLayer
                )
                .orElse(null);

        if (assignment == null) {
            assignmentRepository.save(new Assignment(
                    employee,
                    request.getDate(),
                    requestedLayer,
                    shiftType
            ));

            return "CREATED";
        }

        assignmentRepository.delete(assignment);

        assignmentRepository.save(new Assignment(
                employee,
                request.getDate(),
                requestedLayer,
                shiftType
        ));

        return "UPDATED";
    }

    @GetMapping("/assignments")
    @ResponseBody
    public List<Assignment> getAssignments() {
        return assignmentRepository.findAll();
    }

    @DeleteMapping("/assignments")
    @ResponseBody
    public String deleteAssignment(
            @RequestParam Long employeeId,
            @RequestParam String date,
            @RequestParam(required = false) String assignmentLayer
    ) {
        Employee employee = employeeRepository.findById(employeeId).orElse(null);

        if (employee == null) {
            return "EMPLOYEE_NOT_FOUND";
        }

        String normalizedLayer = normalizeAssignmentLayer(assignmentLayer);

        Assignment assignment = assignmentRepository
                .findByEmployeeAndAssignmentDateAndAssignmentLayer(
                        employee,
                        date,
                        normalizedLayer
                )
                .orElse(null);

        if (assignment == null) {
            return "NOT_FOUND";
        }

        assignmentRepository.delete(assignment);

        return "OK";
    }

    @PostMapping("/employees")
    public String addEmployee(
            @RequestParam String name,
            @RequestParam(required = false) List<String> selectedSkills,
            @RequestParam Integer vacationHours,
            @RequestParam Integer year,
            @RequestParam Integer month,
            RedirectAttributes redirectAttributes
    ) {
        String cleanedName = name.trim();

        if (cleanedName.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "A dolgozó neve nem lehet üres.");
            return redirectToManage(year, month);
        }

        if (employeeRepository.existsByNameIgnoreCase(cleanedName)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Már létezik ilyen nevű dolgozó: " + cleanedName);
            return redirectToManage(year, month);
        }

        if (vacationHours < 0) {
            redirectAttributes.addFlashAttribute("errorMessage", "A szabadság óraszáma nem lehet negatív.");
            return redirectToManage(year, month);
        }

        if (selectedSkills == null) {
            selectedSkills = new ArrayList<>();
        }

        employeeRepository.save(new Employee(cleanedName, selectedSkills, vacationHours));

        redirectAttributes.addFlashAttribute("successMessage", "Dolgozó sikeresen hozzáadva: " + cleanedName);

        return redirectToManage(year, month);
    }

    @PostMapping("/employees/update")
    public String updateEmployee(
            @RequestParam Long id,
            @RequestParam String name,
            @RequestParam(required = false) List<String> selectedSkills,
            @RequestParam Integer vacationHours,
            @RequestParam Integer year,
            @RequestParam Integer month,
            RedirectAttributes redirectAttributes
    ) {
        Employee employee = employeeRepository.findById(id).orElse(null);

        if (employee == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nem található a módosítandó dolgozó.");
            return redirectToManage(year, month);
        }

        String cleanedName = name.trim();

        if (cleanedName.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "A dolgozó neve nem lehet üres.");
            return redirectToManage(year, month);
        }

        if (employeeRepository.existsByNameIgnoreCaseAndIdNot(cleanedName, id)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Már létezik ilyen nevű dolgozó: " + cleanedName);
            return redirectToManage(year, month);
        }

        if (vacationHours < 0) {
            redirectAttributes.addFlashAttribute("errorMessage", "A szabadság óraszáma nem lehet negatív.");
            return redirectToManage(year, month);
        }

        if (selectedSkills == null) {
            selectedSkills = new ArrayList<>();
        }

        employee.setName(cleanedName);
        employee.setVacationHours(vacationHours);
        employee.setSkills(selectedSkills);

        employeeRepository.save(employee);

        redirectAttributes.addFlashAttribute("successMessage", "Dolgozó sikeresen módosítva: " + cleanedName);

        return redirectToManage(year, month);
    }

    @PostMapping("/employees/delete")
    public String deleteEmployee(
            @RequestParam Long id,
            @RequestParam Integer year,
            @RequestParam Integer month,
            RedirectAttributes redirectAttributes
    ) {
        Employee employee = employeeRepository.findById(id).orElse(null);

        if (employee == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nem található a törlendő dolgozó.");
            return redirectToManage(year, month);
        }

        String employeeName = employee.getName();

        List<Assignment> assignmentsToDelete = assignmentRepository.findByEmployee(employee);
        assignmentRepository.deleteAll(assignmentsToDelete);

        employeeRepository.delete(employee);

        redirectAttributes.addFlashAttribute("successMessage", "Dolgozó törölve: " + employeeName);

        return redirectToManage(year, month);
    }

    @PostMapping("/shift-types")
    public String addShiftType(
            @RequestParam String code,
            @RequestParam Double hours,
            @RequestParam(required = false) String night,
            @RequestParam(required = false) String standby,
            @RequestParam(required = false) String homeOffice,
            @RequestParam(required = false) String description,
            @RequestParam Integer year,
            @RequestParam Integer month,
            RedirectAttributes redirectAttributes
    ) {
        String cleanedCode = code.trim().toUpperCase();

        if (cleanedCode.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "A műszak kódja nem lehet üres.");
            return redirectToManage(year, month);
        }

        if (shiftTypeRepository.existsByCodeIgnoreCase(cleanedCode)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Már létezik ilyen műszak kód: " + cleanedCode);
            return redirectToManage(year, month);
        }

        if (hours == null || hours < 0) {
            redirectAttributes.addFlashAttribute("errorMessage", "A műszak óraszáma nem lehet negatív.");
            return redirectToManage(year, month);
        }

        String cleanedDescription = "";

        if (description != null) {
            cleanedDescription = description.trim();
        }

        ShiftType shiftType = new ShiftType(
                cleanedCode,
                hours,
                night != null,
                standby != null,
                homeOffice != null,
                cleanedDescription
        );

        shiftTypeRepository.save(shiftType);

        redirectAttributes.addFlashAttribute("successMessage", "Műszak sikeresen hozzáadva: " + cleanedCode);

        return redirectToManage(year, month);
    }

    @PostMapping("/shift-types/update")
    public String updateShiftType(
            @RequestParam Long id,
            @RequestParam String code,
            @RequestParam Double hours,
            @RequestParam(required = false) String night,
            @RequestParam(required = false) String standby,
            @RequestParam(required = false) String homeOffice,
            @RequestParam(required = false) String description,
            @RequestParam Integer year,
            @RequestParam Integer month,
            RedirectAttributes redirectAttributes
    ) {
        ShiftType shiftType = shiftTypeRepository.findById(id).orElse(null);

        if (shiftType == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nem található a módosítandó műszak.");
            return redirectToManage(year, month);
        }

        if (isSpecialShiftType(shiftType.getCode())) {
            redirectAttributes.addFlashAttribute(
                    "errorMessage",
                    "Ez egy rendszer műszak, nem módosítható: " + shiftType.getCode()
            );
            return redirectToManage(year, month);
        }

        String cleanedCode = code.trim().toUpperCase();

        if (cleanedCode.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "A műszak kódja nem lehet üres.");
            return redirectToManage(year, month);
        }

        if (shiftTypeRepository.existsByCodeIgnoreCaseAndIdNot(cleanedCode, id)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Már létezik ilyen műszak kód: " + cleanedCode);
            return redirectToManage(year, month);
        }

        if (hours == null || hours < 0) {
            redirectAttributes.addFlashAttribute("errorMessage", "A műszak óraszáma nem lehet negatív.");
            return redirectToManage(year, month);
        }

        String cleanedDescription = "";

        if (description != null) {
            cleanedDescription = description.trim();
        }

        shiftType.setCode(cleanedCode);
        shiftType.setHours(hours);
        shiftType.setNight(night != null);
        shiftType.setStandby(standby != null);
        shiftType.setHomeOffice(homeOffice != null);
        shiftType.setDescription(cleanedDescription);

        shiftTypeRepository.save(shiftType);

        redirectAttributes.addFlashAttribute("successMessage", "Műszak sikeresen módosítva: " + cleanedCode);

        return redirectToManage(year, month);
    }

    @PostMapping("/shift-types/delete")
    public String deleteShiftType(
            @RequestParam Long id,
            @RequestParam Integer year,
            @RequestParam Integer month,
            RedirectAttributes redirectAttributes
    ) {
        ShiftType shiftType = shiftTypeRepository.findById(id).orElse(null);

        if (shiftType == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nem található a törlendő műszak.");
            return redirectToManage(year, month);
        }

        String code = shiftType.getCode();

        if (isSpecialShiftType(code)) {
            redirectAttributes.addFlashAttribute(
                    "errorMessage",
                    "Ez egy rendszer műszak, nem törölhető: " + code
            );
            return redirectToManage(year, month);
        }

        boolean usedInAssignments = assignmentRepository.findAll()
                .stream()
                .anyMatch(assignment -> assignment.getShiftTypeId() != null
                        && assignment.getShiftTypeId().equals(id));

        if (usedInAssignments) {
            redirectAttributes.addFlashAttribute(
                    "errorMessage",
                    "A műszak nem törölhető, mert már van hozzá beosztás: " + code
            );
            return redirectToManage(year, month);
        }

        shiftTypeRepository.delete(shiftType);

        redirectAttributes.addFlashAttribute("successMessage", "Műszak törölve: " + code);

        return redirectToManage(year, month);
    }

    @PostMapping("/skills")
    public String addSkill(
            @RequestParam String skillName,
            @RequestParam(required = false) String skillDescription,
            @RequestParam Integer year,
            @RequestParam Integer month,
            RedirectAttributes redirectAttributes
    ) {
        String cleanedSkillName = skillName.trim();

        if (cleanedSkillName.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "A skill neve nem lehet üres.");
            return redirectToManage(year, month);
        }

        if (skillRepository.existsByName(cleanedSkillName)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Már létezik ilyen skill: " + cleanedSkillName);
            return redirectToManage(year, month);
        }

        String cleanedDescription = "";

        if (skillDescription != null) {
            cleanedDescription = skillDescription.trim();
        }

        skillRepository.save(new Skill(cleanedSkillName, cleanedDescription));

        redirectAttributes.addFlashAttribute("successMessage", "Skill sikeresen hozzáadva: " + cleanedSkillName);

        return redirectToManage(year, month);
    }

    @PostMapping("/skills/description")
    public String updateSkillDescription(
            @RequestParam Long id,
            @RequestParam String skillDescription,
            @RequestParam Integer year,
            @RequestParam Integer month,
            RedirectAttributes redirectAttributes
    ) {
        Skill skill = skillRepository.findById(id).orElse(null);

        if (skill == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nem található a módosítandó skill.");
            return redirectToManage(year, month);
        }

        skill.setDescription(skillDescription.trim());
        skillRepository.save(skill);

        redirectAttributes.addFlashAttribute("successMessage", "Skill leírás módosítva: " + skill.getName());

        return redirectToManage(year, month);
    }

    @PostMapping("/skills/delete")
    public String deleteSkill(
            @RequestParam String skillName,
            @RequestParam Integer year,
            @RequestParam Integer month,
            RedirectAttributes redirectAttributes
    ) {
        Skill skill = skillRepository.findByName(skillName).orElse(null);

        if (skill == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nem található a törlendő skill: " + skillName);
            return redirectToManage(year, month);
        }

        skillRepository.delete(skill);

        List<Employee> allEmployees = employeeRepository.findAll();

        for (Employee employee : allEmployees) {
            employee.removeSkill(skillName);
            employeeRepository.save(employee);
        }

        redirectAttributes.addFlashAttribute("successMessage", "Skill törölve: " + skillName);

        return redirectToManage(year, month);
    }

    private void ensureSpecialShiftTypesExist() {
        ShiftType vacationShift = shiftTypeRepository.findByCodeIgnoreCase("SZ").orElse(null);

        if (vacationShift == null) {
            shiftTypeRepository.save(new ShiftType("SZ", 8, false, false, false, "Szabadság"));
        } else {
            vacationShift.setHours(8);
            vacationShift.setNight(false);
            vacationShift.setStandby(false);
            vacationShift.setHomeOffice(false);
            vacationShift.setDescription("Szabadság");
            shiftTypeRepository.save(vacationShift);
        }

        ShiftType unavailableShift = shiftTypeRepository.findByCodeIgnoreCase("-").orElse(null);

        if (unavailableShift == null) {
            shiftTypeRepository.save(new ShiftType("-", 0, false, false, false, "Nem szeretne dolgozni"));
        } else {
            unavailableShift.setHours(0);
            unavailableShift.setNight(false);
            unavailableShift.setStandby(false);
            unavailableShift.setHomeOffice(false);
            unavailableShift.setDescription("Nem szeretne dolgozni");
            shiftTypeRepository.save(unavailableShift);
        }
    }

    private String normalizeAssignmentLayer(String assignmentLayer) {
        if (Assignment.LAYER_STANDBY.equalsIgnoreCase(assignmentLayer)) {
            return Assignment.LAYER_STANDBY;
        }

        return Assignment.LAYER_NORMAL;
    }

    private List<ScheduleDay> createScheduleDays(YearMonth currentYearMonth) {
        List<ScheduleDay> days = new ArrayList<>();

        LocalDate firstDayOfMonth = currentYearMonth.atDay(1);

        for (int i = 2; i >= 1; i--) {
            LocalDate date = firstDayOfMonth.minusDays(i);
            days.add(new ScheduleDay(date, false));
        }

        for (int day = 1; day <= currentYearMonth.lengthOfMonth(); day++) {
            LocalDate date = currentYearMonth.atDay(day);
            days.add(new ScheduleDay(date, true));
        }

        return days;
    }

    private String redirectToManage(Integer year, Integer month) {
        return "redirect:/manage?year=" + year + "&month=" + month;
    }

    private List<ShiftType> getManageableShiftTypes() {
        return shiftTypeRepository.findAll()
                .stream()
                .filter(shiftType -> !isSpecialShiftType(shiftType.getCode()))
                .toList();
    }

    private boolean isSpecialShiftType(String code) {
        if (code == null) {
            return false;
        }

        String normalizedCode = code.trim().toUpperCase();

        return normalizedCode.equals("SZ") || normalizedCode.equals("-");
    }

    private List<String> getSkillNames() {
        return skillRepository.findAll()
                .stream()
                .map(Skill::getName)
                .toList();
    }
}