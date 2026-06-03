package com.example.BalanceFit.service;

import com.example.BalanceFit.dto.ReservationDto;
import com.example.BalanceFit.entity.Class;
import com.example.BalanceFit.entity.Reservation;
import com.example.BalanceFit.repository.ClassRepository;
import com.example.BalanceFit.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final ClassRepository classRepository;

    public Reservation createReservation(String userId, String classId) {

        Class cls = classRepository.findById(classId);

        if (cls == null) {
            throw new RuntimeException("클래스 없음");
        }

        int confirmedCount = reservationRepository
                .findByClassIdAndStatus(classId, "CONFIRMED")
                .size();

        Reservation r = new Reservation();
        r.setReservationId(UUID.randomUUID().toString());
        r.setUserId(userId);
        r.setClassId(classId);

        if (confirmedCount < cls.getMaxCapacity()) {
            r.setStatus("CONFIRMED");
        } else {
            r.setStatus("WAITING");
        }

        reservationRepository.save(r);
        return r;
    }

    public void cancelReservation(String reservationId) {

        Reservation r = reservationRepository.findById(reservationId);

        if (r == null) {
            throw new RuntimeException("예약 없음");
        }

        reservationRepository.deleteById(reservationId);

        promoteWaitingUser(r.getClassId());
    }

    private void promoteWaitingUser(String classId) {

        List<Reservation> waitingList =
                reservationRepository.findWaitingByClassId(classId);

        if (waitingList.isEmpty()) return;

        Reservation first = waitingList.get(0);
        first.setStatus("CONFIRMED");

        reservationRepository.save(first);
    }

    // ⭐⭐⭐ 핵심 변경 부분
    public List<ReservationDto> getUserReservations(String userId) {

        List<Reservation> reservations =
                reservationRepository.findByUserId(userId);

        return reservations.stream().map(r -> {

            Class cls = classRepository.findById(r.getClassId());

            return new ReservationDto(
                    r.getReservationId(),
                    r.getUserId(),
                    r.getClassId(),
                    r.getStatus(),
                    cls != null ? cls.getTitle() : "",
                    cls != null ? cls.getInstructor() : "",
                    cls != null ? cls.getStartTime() : "",
                    cls != null ? cls.getMaxCapacity() : 0
            );
        }).toList();
    }
}