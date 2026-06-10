package com.example.BalanceFit.controller;

import com.example.BalanceFit.dto.ChatMessageRequest;
import com.example.BalanceFit.dto.ChatInstructorRoomRequest;
import com.example.BalanceFit.entity.ChatMessage;
import com.example.BalanceFit.entity.ChatRoom;
import com.example.BalanceFit.service.ChatService;
import com.example.BalanceFit.service.ChatStreamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.List;

@RestController
@RequestMapping("/chats")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final ChatStreamService chatStreamService;

    @PostMapping("/rooms/support")
    public ResponseEntity<?> getOrCreateSupportRoom(HttpSession session, HttpServletRequest request) {
        try {
            String userId = getAuthenticatedUserId(session, request);
            return ResponseEntity.ok(chatService.getOrCreateSupportRoom(userId));
        } catch (UnauthenticatedException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/rooms/instructor")
    public ResponseEntity<?> getOrCreateInstructorRoom(
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestBody ChatInstructorRoomRequest request
    ) {
        try {
            String userId = getAuthenticatedUserId(session, servletRequest);
            return ResponseEntity.ok(chatService.getOrCreateInstructorRoom(
                    userId,
                    request == null ? null : request.getClassId(),
                    request == null ? null : request.getInstructorName()
            ));
        } catch (UnauthenticatedException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/rooms")
    public ResponseEntity<?> getRooms(HttpSession session, HttpServletRequest request) {
        try {
            String userId = getAuthenticatedUserId(session, request);
            List<ChatRoom> rooms = chatService.getRooms(userId);
            return ResponseEntity.ok(rooms);
        } catch (UnauthenticatedException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> getMessages(@PathVariable String roomId, HttpSession session, HttpServletRequest request) {
        try {
            String userId = getAuthenticatedUserId(session, request);
            List<ChatMessage> messages = chatService.getMessages(roomId, userId);
            return ResponseEntity.ok(messages);
        } catch (UnauthenticatedException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/rooms/{roomId}/stream")
    public ResponseEntity<?> streamMessages(@PathVariable String roomId, HttpSession session, HttpServletRequest request) {
        try {
            String userId = getAuthenticatedUserId(session, request);
            chatService.validateRoomAccess(roomId, userId);
            SseEmitter emitter = chatStreamService.subscribe(roomId);
            return ResponseEntity.ok(emitter);
        } catch (UnauthenticatedException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/rooms/{roomId}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable String roomId,
            HttpSession session,
            HttpServletRequest servletRequest,
            @RequestBody ChatMessageRequest request
    ) {
        try {
            String userId = getAuthenticatedUserId(session, servletRequest);
            ChatMessage message = chatService.sendMessage(roomId, userId, request.getMessage());
            return ResponseEntity.ok(message);
        } catch (UnauthenticatedException e) {
            return ResponseEntity.status(401).body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private String getAuthenticatedUserId(HttpSession session, HttpServletRequest request) {
        Object userId = session.getAttribute("userId");
        if (userId instanceof String sessionUserId) {
            String value = sessionUserId.trim();
            if (!value.isEmpty()) {
                return value;
            }
        }

        String headerUserId = request.getHeader("X-User-Id");
        if (headerUserId != null && !headerUserId.trim().isEmpty()) {
            return headerUserId.trim();
        }

        String queryUserId = request.getParameter("userId");
        if (queryUserId != null && !queryUserId.trim().isEmpty()) {
            return queryUserId.trim();
        }

        throw new UnauthenticatedException("로그인이 필요합니다.");
    }

    private static class UnauthenticatedException extends RuntimeException {
        UnauthenticatedException(String message) {
            super(message);
        }
    }
}
