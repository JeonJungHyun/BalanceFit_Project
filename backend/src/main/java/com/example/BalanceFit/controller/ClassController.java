package com.example.BalanceFit.controller;

import com.example.BalanceFit.entity.Class;
import com.example.BalanceFit.service.ClassService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/classes")
@RequiredArgsConstructor
public class ClassController {

    private final ClassService classService;

    // 1. 클래스 생성
    @PostMapping
    public Class createClass(@RequestBody Class cls) {
        return classService.createClass(cls);
    }

    // 2. 전체 조회
    @GetMapping
    public List<Class> getAllClasses() {
        return classService.getAllClasses();
    }

    // 3. 단일 조회
    @GetMapping("/{id}")
    public Class getClassById(@PathVariable String id) {
        System.out.println("Backend Request Started: classId=" + id);
        return classService.getClassById(id);
    }

    // 4. 수정
    @PutMapping("/{id}")
    public Class updateClass(@PathVariable String id, @RequestBody Class cls) {
        return classService.updateClass(id, cls);
    }

    // 5. 삭제
    @DeleteMapping("/{id}")
    public String deleteClass(@PathVariable String id) {
        classService.deleteClass(id);
        return "deleted class id = " + id;
    }
}
