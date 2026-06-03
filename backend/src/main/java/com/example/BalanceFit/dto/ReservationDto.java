package com.example.BalanceFit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReservationDto {

    private String reservationId;
    private String userId;
    private String classId;
    private String status;

    private String title;
    private String instructor;
    private String startTime;
    private int maxCapacity;
}