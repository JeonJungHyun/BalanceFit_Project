package com.example.BalanceFit.service;

import com.example.BalanceFit.entity.Class;
import com.example.BalanceFit.repository.ClassRepository;
import com.example.BalanceFit.repository.ReservationRepository;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@EnableScheduling
@RequiredArgsConstructor
public class ClassService {

    private final ClassRepository classRepository;
    private final ReservationRepository reservationRepository;

    private static final Map<DayOfWeek, List<ScheduleTemplate>> WEEKLY_SCHEDULE = new LinkedHashMap<>();

    static {
        WEEKLY_SCHEDULE.put(DayOfWeek.MONDAY, List.of(
                new ScheduleTemplate("매트",         "손유진", 10, 0,  5),
                new ScheduleTemplate("바렐+체어",    "정효린", 13, 0,  8)
        ));
        WEEKLY_SCHEDULE.put(DayOfWeek.TUESDAY, List.of(
                new ScheduleTemplate("콤비리포머",   "최유미", 14, 0,  3),
                new ScheduleTemplate("스파인코렉터", "서지우", 15, 0, 12)
        ));
        WEEKLY_SCHEDULE.put(DayOfWeek.WEDNESDAY, List.of(
                new ScheduleTemplate("리포머+바렐",  "이혜지", 10, 0, 10),
                new ScheduleTemplate("체어",         "김연주", 11, 0,  8),
                new ScheduleTemplate("케딜락",       "정유주", 12, 0,  6),
                new ScheduleTemplate("매트",         "박서연", 13, 0, 10),
                new ScheduleTemplate("소도구",       "최서영", 14, 0,  6)
        ));
        WEEKLY_SCHEDULE.put(DayOfWeek.THURSDAY, List.of(
                new ScheduleTemplate("콤비리포머",   "최유미", 10, 0,  5),
                new ScheduleTemplate("스파인코렉터", "서지우", 11, 0, 10),
                new ScheduleTemplate("바렐+체어",    "정효린", 12, 0,  8)
        ));
        WEEKLY_SCHEDULE.put(DayOfWeek.FRIDAY, List.of(
                new ScheduleTemplate("매트",         "손유진", 10, 0,  5),
                new ScheduleTemplate("소도구",       "최서영", 14, 0,  6)
        ));
        WEEKLY_SCHEDULE.put(DayOfWeek.SATURDAY, List.of(
                new ScheduleTemplate("케딜락",       "정유주", 12, 0,  6)
        ));
    }

    private static final int WEEKS_AHEAD = 4;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @PostConstruct
    public void initSchedule() {
        generateUpcomingClasses();
    }

    @Scheduled(cron = "0 0 0 * * MON")
    public void weeklySchedule() {
        generateUpcomingClasses();
    }

    private void generateUpcomingClasses() {
        LocalDate monday = LocalDate.now().with(DayOfWeek.MONDAY);

        for (int week = 0; week < WEEKS_AHEAD; week++) {
            for (Map.Entry<DayOfWeek, List<ScheduleTemplate>> entry : WEEKLY_SCHEDULE.entrySet()) {
                LocalDate date = monday.plusWeeks(week).with(entry.getKey());
                for (ScheduleTemplate t : entry.getValue()) {
                    String classId = date.format(DATE_FORMATTER) + "_" + t.title + "_" + t.instructor;
                    LocalDateTime startDateTime = date.atTime(t.hour, t.minute);
                    String startTime = startDateTime.format(FORMATTER);

                    Class cls = new Class();
                    cls.setClassId(classId);
                    cls.setTitle(t.title);
                    cls.setInstructor(t.instructor);
                    cls.setStartTime(startTime);
                    cls.setMaxCapacity(t.maxCapacity);
                    cls.setCurrentReservations(0);
                    classRepository.save(cls);
                }
            }
        }
    }

    private record ScheduleTemplate(String title, String instructor, int hour, int minute, int maxCapacity) {}

    public Class createClass(Class cls) {
        cls.setCurrentReservations(0);
        classRepository.save(cls);
        return cls;
    }

    public List<Class> getAllClasses() {
        List<Class> list = classRepository.findAll();
        for (Class cls : list) {
            int confirmedCount =
                    reservationRepository
                            .findByClassIdAndStatus(cls.getClassId(), "CONFIRMED")
                            .size();
            cls.setCurrentReservations(confirmedCount);
        }
        return list;
    }

    public Class getClassById(String id) {
        Class cls = classRepository.findById(id);
        if (cls == null) {
            throw new RuntimeException("클래스 없음: " + id);
        }
        int confirmedCount =
                reservationRepository
                        .findByClassIdAndStatus(cls.getClassId(), "CONFIRMED")
                        .size();
        cls.setCurrentReservations(confirmedCount);
        return cls;
    }

    public Class updateClass(String id, Class updatedClass) {
        Class existing = classRepository.findById(id);
        if (existing == null) {
            throw new RuntimeException("클래스 없음: " + id);
        }
        existing.setTitle(updatedClass.getTitle());
        existing.setInstructor(updatedClass.getInstructor());
        existing.setStartTime(updatedClass.getStartTime());
        existing.setMaxCapacity(updatedClass.getMaxCapacity());
        classRepository.save(existing);
        return existing;
    }

    public void deleteClass(String id) {
        classRepository.deleteById(id);
    }
}