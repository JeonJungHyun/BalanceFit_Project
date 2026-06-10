package com.example.BalanceFit.service;

import com.example.BalanceFit.dto.InstructorClassParticipantDto;
import com.example.BalanceFit.dto.InstructorClassScheduleDto;
import com.example.BalanceFit.entity.Reservation;
import com.example.BalanceFit.entity.User;
import com.google.cloud.firestore.Firestore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class InstructorDashboardService {

    private final Firestore firestore;

    public List<InstructorClassScheduleDto> getClassesByInstructor(String instructorName) {
        String normalizedInstructorName = normalizeInstructorName(instructorName);

        try {
            return firestore.collection("classes")
                    .whereEqualTo("instructor", normalizedInstructorName)
                    .get()
                    .get()
                    .getDocuments()
                    .stream()
                    .map(document -> document.toObject(com.example.BalanceFit.entity.Class.class))
                    .filter(Objects::nonNull)
                    .sorted(Comparator.comparing(com.example.BalanceFit.entity.Class::getStartTime, Comparator.nullsLast(String::compareTo)))
                    .map(this::toScheduleDto)
                    .toList();
        } catch (Exception e) {
            throw new RuntimeException("강사 수업 목록 조회 실패: " + normalizedInstructorName, e);
        }
    }

    private InstructorClassScheduleDto toScheduleDto(com.example.BalanceFit.entity.Class classItem) {
        List<InstructorClassParticipantDto> confirmedParticipants = getParticipants(classItem.getClassId(), "CONFIRMED");
        List<InstructorClassParticipantDto> waitingParticipants = getParticipants(classItem.getClassId(), "WAITING");

        return new InstructorClassScheduleDto(
                classItem.getClassId(),
                classItem.getTitle(),
                classItem.getInstructor(),
                classItem.getStartTime(),
                classItem.getMaxCapacity(),
                confirmedParticipants.size(),
                waitingParticipants.size(),
                confirmedParticipants,
                waitingParticipants
        );
    }

    private List<InstructorClassParticipantDto> getParticipants(String classId, String status) {
        try {
            return firestore.collection("reservations")
                    .whereEqualTo("classId", classId)
                    .whereEqualTo("status", status)
                    .get()
                    .get()
                    .toObjects(Reservation.class)
                    .stream()
                    .map(this::toParticipantDto)
                    .toList();
        } catch (Exception e) {
            throw new RuntimeException("수업 참여자 조회 실패: " + classId + ", " + status, e);
        }
    }

    private InstructorClassParticipantDto toParticipantDto(Reservation reservation) {
        User user = findUser(reservation.getUserId());
        String userName = user != null && user.getName() != null && !user.getName().isBlank()
                ? user.getName()
                : reservation.getUserId();
        String email = user == null ? "" : nullToEmpty(user.getEmail());

        return new InstructorClassParticipantDto(
                reservation.getReservationId(),
                reservation.getUserId(),
                userName,
                email,
                reservation.getStatus()
        );
    }

    private User findUser(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }

        try {
            return firestore.collection("users")
                    .document(userId)
                    .get()
                    .get()
                    .toObject(User.class);
        } catch (Exception e) {
            return null;
        }
    }

    private String normalizeInstructorName(String instructorName) {
        if (instructorName == null || instructorName.isBlank()) {
            throw new IllegalArgumentException("강사 이름이 필요합니다.");
        }

        return instructorName.trim();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
