package com.example.BalanceFit.repository;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.example.BalanceFit.entity.Class;
import com.google.cloud.firestore.Firestore;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ClassRepository {

    private final Firestore firestore;

    // 저장
    public void save(Class cls) {
        firestore.collection("classes")
                .document(cls.getClassId())
                .set(cls);
    }

    // 단일 조회
    public Class findById(String id) {
        try {
            return firestore.collection("classes")
                    .document(id)
                    .get()
                    .get()
                    .toObject(Class.class);
        } catch (Exception e) {
            throw new RuntimeException("클래스 조회 실패: " + id, e);
        }
    }

    // 전체 조회
    public List<Class> findAll() {
    try {
        var future = firestore.collection("classes").get();
        var snapshot = future.get();

        return snapshot.getDocuments()
                .stream()
                .map(doc -> doc.toObject(Class.class))
                .toList();

    } catch (Exception e) {
        throw new RuntimeException("전체 클래스 조회 실패", e);
    }
}

    // 삭제
    public void deleteById(String id) {
        firestore.collection("classes")
                .document(id)
                .delete();
    }
}