package com.example.BalanceFit.controller;

import com.example.BalanceFit.dto.InstructorClassScheduleDto;
import com.example.BalanceFit.service.InstructorDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/instructor")
@RequiredArgsConstructor
public class InstructorDashboardController {

    private final InstructorDashboardService instructorDashboardService;

    @GetMapping("/classes")
    public ResponseEntity<?> getInstructorClasses(@RequestParam String instructorName) {
        try {
            List<InstructorClassScheduleDto> classes =
                    instructorDashboardService.getClassesByInstructor(instructorName);
            return ResponseEntity.ok(classes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
