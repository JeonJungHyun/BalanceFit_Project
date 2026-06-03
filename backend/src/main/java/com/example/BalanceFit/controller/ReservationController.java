package com.example.BalanceFit.controller;

import com.example.BalanceFit.dto.ReservationDto;
import com.example.BalanceFit.entity.Reservation;
import com.example.BalanceFit.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    public Reservation createReservation(
            @RequestParam String userId,
            @RequestParam String classId
    ) {
        return reservationService.createReservation(userId, classId);
    }

    @DeleteMapping("/{reservationId}")
    public String cancelReservation(@PathVariable String reservationId) {
        reservationService.cancelReservation(reservationId);
        return "예약이 취소되었습니다: " + reservationId;
    }

    // ⭐⭐⭐ 이거 다시 살려야 함 (프론트용 핵심)
    @GetMapping("/user/{userId}")
    public List<ReservationDto> getUserReservations(@PathVariable String userId) {
        return reservationService.getUserReservations(userId);
    }
}