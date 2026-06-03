package com.example.BalanceFit.service;

import com.example.BalanceFit.entity.Class;
import com.example.BalanceFit.repository.ClassRepository;
import com.example.BalanceFit.repository.ReservationRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassService {

    private final ClassRepository classRepository;
    private final ReservationRepository reservationRepository;

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