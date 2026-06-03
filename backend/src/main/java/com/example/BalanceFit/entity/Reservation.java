package com.example.BalanceFit.entity;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class Reservation {
    private String reservationId;
    private String userId;
    private String classId;
    private String status;  // 예약 상태 (예: 예약 완료, 취소 등)
}
