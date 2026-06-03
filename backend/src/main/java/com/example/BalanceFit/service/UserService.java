package com.example.BalanceFit.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.BalanceFit.entity.User;
import com.example.BalanceFit.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    // 1. 유저 생성
    public User createUser(User user) {
        userRepository.save(user);
        return user;
    }

    // 2. 전체 유저 조회
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // 3. 단일 유저 조회
    public User getUserById(String id) {
    User user = userRepository.findById(id);

    if (user == null) {
        throw new RuntimeException("유저 없음: " + id);
    }

    return user;
}
    
    // 4. 유저 수정
    public User updateUser(String id, User user) {
        
        // 기존 데이터 조회 (없으면 예외)
        User existing = userRepository.findById(id);

        if (existing == null) {
            throw new RuntimeException("유저 없음: " + id);
        }
                
        // 값 수정
        existing.setName(user.getName());
        existing.setEmail(user.getEmail());

        // 다시 저장
        userRepository.save(existing);

        // 수정된 값 반환
        return existing;
    }

    // 5. 유저 삭제
    public void deleteUser(String id) {
        // 삭제
        userRepository.deleteById(id);
    }

    // 6. 회원가입(아이디 중복 체크)
    public User signup(User user) {
        // 아이디 중복 체크
        User existing = userRepository.findById(user.getUserId());
        if (existing != null) {
            throw new IllegalArgumentException("이미 사용중인 아이디입니다.");
        }
        userRepository.save(user);
        return user;
    }

    // 7. 로그인
    public User login(String userId, String password) {
        User user = userRepository.findById(userId);  // org.apache.catalina.User 제거
        if (user == null) {
            throw new IllegalArgumentException("존재하지 않는 아이디입니다.");
        }
        if (!user.getPassword().equals(password)) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }
        return user;
    }
    // 8. 아이디 존재 여부 확인
    public User getUserByIdOrNull(String id) {
        try {
            return userRepository.findById(id);
        } catch (Exception e) {
            return null;
        }
    }
}   