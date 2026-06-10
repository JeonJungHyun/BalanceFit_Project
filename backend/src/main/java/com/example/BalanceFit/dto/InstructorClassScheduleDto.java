package com.example.BalanceFit.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InstructorClassScheduleDto {
    private String classId;
    private String title;
    private String instructor;
    private String startTime;
    private int maxCapacity;
    private int confirmedCount;
    private int waitingCount;
    private List<InstructorClassParticipantDto> confirmedParticipants;
    private List<InstructorClassParticipantDto> waitingParticipants;
}
