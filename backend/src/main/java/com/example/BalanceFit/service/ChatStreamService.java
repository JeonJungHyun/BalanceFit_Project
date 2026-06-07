package com.example.BalanceFit.service;

import com.example.BalanceFit.entity.ChatMessage;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ChatStreamService {

    private static final long TIMEOUT = 30L * 60L * 1000L;

    private final Map<String, List<SseEmitter>> emittersByRoom = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String roomId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT);
        emittersByRoom.computeIfAbsent(roomId, key -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(roomId, emitter));
        emitter.onTimeout(() -> removeEmitter(roomId, emitter));
        emitter.onError((error) -> removeEmitter(roomId, emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("connected"));
        } catch (IOException e) {
            removeEmitter(roomId, emitter);
        }

        return emitter;
    }

    public void emitMessage(ChatMessage message) {
        List<SseEmitter> emitters = emittersByRoom.get(message.getRoomId());
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("message").data(message));
            } catch (IOException | IllegalStateException e) {
                removeEmitter(message.getRoomId(), emitter);
            }
        }
    }

    private void removeEmitter(String roomId, SseEmitter emitter) {
        List<SseEmitter> emitters = emittersByRoom.get(roomId);
        if (emitters == null) {
            return;
        }

        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersByRoom.remove(roomId);
        }
    }
}
