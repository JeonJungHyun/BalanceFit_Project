package com.example.BalanceFit.repository;

import com.example.BalanceFit.entity.User;
import com.google.cloud.firestore.Firestore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class UserRepository {

    private final Firestore firestore;

    // =========================
    // 1. 저장 (Create / Update)
    // =========================
    public void save(User user) {
        firestore.collection("users")
                .document(user.getUserId())
                .set(user);
    }

    // =========================
    // 2. 단일 조회 (Read)
    // =========================
    public User findById(String id) {
        try {
            return firestore.collection("users")
                    .document(id)
                    .get()
                    .get()
                    .toObject(User.class);
        } catch (Exception e) {
            throw new RuntimeException("유저 조회 실패: " + id, e);
        }
    }

    // =========================
    // 3. 전체 조회 (Read All)
    // =========================
    public List<User> findAll() {
        try {
            return firestore.collection("users")
                    .get()
                    .get()
                    .toObjects(User.class);
        } catch (Exception e) {
            throw new RuntimeException("전체 유저 조회 실패", e);
        }
    }

    // =========================
    // 4. 삭제 (Delete)
    // =========================
    public void deleteById(String id) {
        firestore.collection("users")
                .document(id)
                .delete();
    }
}