package com.example.BalanceFit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class InstructorClassParticipantDto {
    private String reservationId;
    private String userId;
    private String userName;
    private String email;
    private String status;
}
