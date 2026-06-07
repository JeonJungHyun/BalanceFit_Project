package com.example.BalanceFit.service;

import com.example.BalanceFit.entity.ChatMessage;
import com.example.BalanceFit.entity.ChatRoom;
import com.example.BalanceFit.repository.ChatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private static final String SUPPORT_ID = "support";
    private static final String SUPPORT_NAME = "밸런스핏 상담";

    private final ChatRepository chatRepository;
    private final ChatStreamService chatStreamService;

    public ChatRoom getOrCreateSupportRoom(String userId) {
        validateUserId(userId);
        if (SUPPORT_ID.equals(userId)) {
            throw new IllegalArgumentException("상담사 계정은 새 문의를 만들 수 없습니다.");
        }

        String roomId = supportRoomId(userId);
        ChatRoom existingRoom = chatRepository.findRoomById(roomId);
        if (existingRoom != null) {
            return existingRoom;
        }

        long now = System.currentTimeMillis();

        ChatRoom room = new ChatRoom();
        room.setRoomId(roomId);
        room.setMemberId(userId);
        room.setSupportId(SUPPORT_ID);
        room.setPartnerName(SUPPORT_NAME);
        room.setLastMessage("");
        room.setCreatedAt(now);
        room.setLastMessageAt(now);
        room.setUnreadMessageSupport(false);
        room.setUnreadMessageMember(false);

        chatRepository.saveRoom(room);
        return room;
    }

    public List<ChatRoom> getRooms(String userId) {
        validateUserId(userId);

        if (SUPPORT_ID.equals(userId)) {
            return chatRepository.findRoomsBySupportId(userId)
                    .stream()
                    .filter(room -> !SUPPORT_ID.equals(room.getMemberId()))
                    .toList();
        }

        return chatRepository.findRoomsByMemberId(userId);
    }

    public List<ChatMessage> getMessages(String roomId, String userId) {
        ChatRoom room = getAccessibleRoom(roomId, userId);
        chatRepository.markRoomReadForUser(room, userId);
        return chatRepository.findMessagesByRoomId(roomId);
    }

    public ChatMessage sendMessage(String roomId, String userId, String messageText) {
        ChatRoom room = getAccessibleRoom(roomId, userId);

        if (messageText == null || messageText.trim().isEmpty()) {
            throw new IllegalArgumentException("메시지를 입력해주세요.");
        }

        long now = System.currentTimeMillis();

        ChatMessage message = new ChatMessage();
        message.setRoomId(roomId);
        message.setSenderId(userId);
        message.setSenderType(SUPPORT_ID.equals(userId) ? "SUPPORT" : "USER");
        message.setMessage(messageText);
        message.setCreatedAt(now);
        message.setIsRead(false);

        ChatMessage savedMessage = chatRepository.saveMessage(message);

        room.setLastMessage(messageText);
        room.setLastMessageAt(now);
        room.setUnreadMessageSupport(!SUPPORT_ID.equals(userId));
        room.setUnreadMessageMember(SUPPORT_ID.equals(userId));
        chatRepository.saveRoom(room);
        chatStreamService.emitMessage(savedMessage);

        return savedMessage;
    }

    public void validateRoomAccess(String roomId, String userId) {
        getAccessibleRoom(roomId, userId);
    }

    private ChatRoom getAccessibleRoom(String roomId, String userId) {
        validateUserId(userId);

        ChatRoom room = chatRepository.findRoomById(roomId);
        if (room == null) {
            throw new IllegalArgumentException("채팅방을 찾을 수 없습니다.");
        }

        if (SUPPORT_ID.equals(room.getMemberId())) {
            throw new SecurityException("접근할 수 없는 채팅방입니다.");
        }

        if (!userId.equals(room.getMemberId()) && !userId.equals(room.getSupportId())) {
            throw new SecurityException("접근할 수 없는 채팅방입니다.");
        }

        return room;
    }

    private String supportRoomId(String userId) {
        return "support_" + userId;
    }

    private void validateUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
    }
}
