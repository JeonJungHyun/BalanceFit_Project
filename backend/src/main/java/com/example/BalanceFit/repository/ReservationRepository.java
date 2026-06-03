package com.example.BalanceFit.repository;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.example.BalanceFit.entity.Reservation;
import com.google.cloud.firestore.Firestore;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ReservationRepository {

    private final Firestore firestore;

    // 저장
    public void save(Reservation r) {

        System.out.println("예약 저장 시작");
        System.out.println("reservationId = " + r.getReservationId());
        System.out.println("userId = " + r.getUserId());
        System.out.println("classId = " + r.getClassId());
        System.out.println("status = " + r.getStatus());

        firestore.collection("reservations")
                .document(r.getReservationId())
                .set(r);

        System.out.println("예약 저장 완료");
    }

    // 단일 조회 
    public Reservation findById(String reservationId) {
        try {
            return firestore.collection("reservations")
                    .document(reservationId)
                    .get()
                    .get()
                    .toObject(Reservation.class);
        } catch (Exception e) {
            throw new RuntimeException("예약 조회 실패", e);
        }
    }
    

    // 조회
    public List<Reservation> findByUserId(String userId) {
    if (userId == null) {
        return List.of();
    }

    try {
        return firestore.collection("reservations")
                .whereEqualTo("userId", userId)
                .get()
                .get()
                .toObjects(Reservation.class);
    } catch (Exception e) {
        e.printStackTrace();
        return List.of(); // ⭐ 절대 500 안 터지게
    }
}

    // 삭제
    public void deleteById(String reservationId) {
        firestore.collection("reservations")
                .document(reservationId)
                .delete();
    }

    // 대기자 조회
    public List<Reservation> findWaitingByClassId(String classId) {
    try {
        return firestore.collection("reservations")
                .whereEqualTo("classId", classId)
                .whereEqualTo("status", "WAITING")
                .get()
                .get()
                .toObjects(Reservation.class);
    } catch (Exception e) {
        e.printStackTrace();
        return java.util.Collections.emptyList();
    }
}

public List<Reservation> findByClassIdAndStatus(String classId, String status) {
    try {
        return firestore.collection("reservations")
                .whereEqualTo("classId", classId)
                .whereEqualTo("status", status)
                .get()
                .get()
                .toObjects(Reservation.class);
    } catch (Exception e) {
        e.printStackTrace();
        return java.util.Collections.emptyList();
    }
}


}
