package com.pufi.scheduler;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Controller
public class ExcelExportController {

    private final EmployeeRepository employeeRepository;
    private final AssignmentRepository assignmentRepository;
    private final SkillRepository skillRepository;
    private final ShiftTypeRepository shiftTypeRepository;

    public ExcelExportController(
            EmployeeRepository employeeRepository,
            AssignmentRepository assignmentRepository,
            SkillRepository skillRepository,
            ShiftTypeRepository shiftTypeRepository
    ) {
        this.employeeRepository = employeeRepository;
        this.assignmentRepository = assignmentRepository;
        this.skillRepository = skillRepository;
        this.shiftTypeRepository = shiftTypeRepository;
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel() throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            createEmployeesSheet(workbook);
            createAssignmentsSheet(workbook);
            createSkillsSheet(workbook);
            createShiftTypesSheet(workbook);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);

            byte[] excelBytes = outputStream.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentDisposition(
                    ContentDisposition.attachment()
                            .filename("scheduler-export.xlsx")
                            .build()
            );

            headers.setContentType(
                    MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    )
            );

            return ResponseEntity
                    .ok()
                    .headers(headers)
                    .body(excelBytes);
        }
    }

    private void createEmployeesSheet(Workbook workbook) {
        Sheet sheet = workbook.createSheet("Dolgozók");

        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Név");
        header.createCell(2).setCellValue("Szabadság órában");
        header.createCell(3).setCellValue("Skillek");

        List<Employee> employees = employeeRepository.findAll();

        int rowIndex = 1;

        for (Employee employee : employees) {
            Row row = sheet.createRow(rowIndex++);

            row.createCell(0).setCellValue(employee.getId());
            row.createCell(1).setCellValue(employee.getName());
            row.createCell(2).setCellValue(employee.getVacationHours());
            row.createCell(3).setCellValue(employee.getSkillsDisplayText());
        }

        autoSizeColumns(sheet, 4);
    }

    private void createAssignmentsSheet(Workbook workbook) {
        Sheet sheet = workbook.createSheet("Beosztások");

        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Dátum");
        header.createCell(2).setCellValue("Dolgozó ID");
        header.createCell(3).setCellValue("Dolgozó neve");
        header.createCell(4).setCellValue("Műszak ID");
        header.createCell(5).setCellValue("Műszak kód");
        header.createCell(6).setCellValue("Óraszám");
        header.createCell(7).setCellValue("Éjszakai");
        header.createCell(8).setCellValue("Készenlét");
        header.createCell(9).setCellValue("HO");
        header.createCell(10).setCellValue("Leírás");

        List<Assignment> assignments = assignmentRepository.findAll();

        int rowIndex = 1;

        for (Assignment assignment : assignments) {
            Row row = sheet.createRow(rowIndex++);

            row.createCell(0).setCellValue(assignment.getId());
            row.createCell(1).setCellValue(assignment.getDate());

            if (assignment.getEmployeeId() != null) {
                row.createCell(2).setCellValue(assignment.getEmployeeId());
            } else {
                row.createCell(2).setCellValue("");
            }

            row.createCell(3).setCellValue(assignment.getEmployeeName());

            if (assignment.getShiftTypeId() != null) {
                row.createCell(4).setCellValue(assignment.getShiftTypeId());
            } else {
                row.createCell(4).setCellValue("");
            }

            row.createCell(5).setCellValue(assignment.getShiftCode());
            row.createCell(6).setCellValue(assignment.getHours());
            row.createCell(7).setCellValue(assignment.isNight() ? "igen" : "nem");
            row.createCell(8).setCellValue(assignment.isStandby() ? "igen" : "nem");
            row.createCell(9).setCellValue(assignment.isHomeOffice() ? "igen" : "nem");
            row.createCell(10).setCellValue(assignment.getShiftDescription());
        }

        autoSizeColumns(sheet, 11);
    }

    private void createSkillsSheet(Workbook workbook) {
        Sheet sheet = workbook.createSheet("Skillek");

        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Skill neve");
        header.createCell(2).setCellValue("Leírás");

        List<Skill> skills = skillRepository.findAll();

        int rowIndex = 1;

        for (Skill skill : skills) {
            Row row = sheet.createRow(rowIndex++);

            row.createCell(0).setCellValue(skill.getId());
            row.createCell(1).setCellValue(skill.getName());
            row.createCell(2).setCellValue(skill.getDescription());
        }

        autoSizeColumns(sheet, 3);
    }

    private void createShiftTypesSheet(Workbook workbook) {
        Sheet sheet = workbook.createSheet("Műszakok");

        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Kód");
        header.createCell(2).setCellValue("Óraszám");
        header.createCell(3).setCellValue("Éjszakai");
        header.createCell(4).setCellValue("Készenlét");
        header.createCell(5).setCellValue("HO");
        header.createCell(6).setCellValue("Leírás");

        List<ShiftType> shiftTypes = shiftTypeRepository.findAll();

        int rowIndex = 1;

        for (ShiftType shiftType : shiftTypes) {
            Row row = sheet.createRow(rowIndex++);

            row.createCell(0).setCellValue(shiftType.getId());
            row.createCell(1).setCellValue(shiftType.getCode());
            row.createCell(2).setCellValue(shiftType.getHours());
            row.createCell(3).setCellValue(shiftType.isNight() ? "igen" : "nem");
            row.createCell(4).setCellValue(shiftType.isStandby() ? "igen" : "nem");
            row.createCell(5).setCellValue(shiftType.isHomeOffice() ? "igen" : "nem");
            row.createCell(6).setCellValue(shiftType.getDescription());
        }

        autoSizeColumns(sheet, 7);
    }

    private void autoSizeColumns(Sheet sheet, int numberOfColumns) {
        for (int i = 0; i < numberOfColumns; i++) {
            sheet.autoSizeColumn(i);
        }
    }
}