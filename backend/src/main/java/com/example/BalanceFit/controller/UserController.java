package com.example.BalanceFit.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.BalanceFit.entity.User;
import com.example.BalanceFit.service.UserService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping    // 유저 생성
    public User createUser(@RequestBody User user) {
        return userService.createUser(user);
    }

    @GetMapping     // 전체 유저 조회
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/check/{userId}")
    public ResponseEntity<?> checkUserId(@PathVariable String userId) {
        try {
            User existing = userService.getUserByIdOrNull(userId);
            if (existing != null) {
                return ResponseEntity.status(409).body("이미 사용 중인 아이디입니다.");
            }
            return ResponseEntity.ok("사용 가능한 아이디입니다.");
        } catch (Exception e) {
            return ResponseEntity.ok("사용 가능한 아이디입니다.");  // 예외 = 없는 유저
        }
    }

    @GetMapping("/{id}")        // 단일 유저 조회
    public User getUserById(@PathVariable String id) {
        return userService.getUserById(id);
    }

    @PutMapping("/{id}")        // 유저 수정
    public User updateUser(@PathVariable String id, @RequestBody User user) {
        return userService.updateUser(id, user);
    }

    @DeleteMapping("/{id}")     // 유저 삭제
    public String deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return "deleted user id = " + id;
    }
    @PostMapping("/signup")     // 회원가입
    public ResponseEntity<?> signup(@RequestBody User user) {
       try {
            User created = userService.signup(user);
            return ResponseEntity.ok(created);
       } catch (IllegalArgumentException e) { 
            return ResponseEntity.status(409).body(e.getMessage());
       }
    }
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {  // org.apache.catalina.User 제거
        try {
            User loggedIn = userService.login(user.getUserId(), user.getPassword());
            return ResponseEntity.ok(loggedIn);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }
}
