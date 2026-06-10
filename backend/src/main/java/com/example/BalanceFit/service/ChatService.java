package com.example.BalanceFit.service;

import com.example.BalanceFit.entity.ChatMessage;
import com.example.BalanceFit.entity.ChatRoom;
import com.example.BalanceFit.repository.ChatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

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

    public ChatRoom getOrCreateInstructorRoom(String userId, String classId, String instructorName) {
        validateUserId(userId);
        validateClassId(classId);

        System.out.println("Firestore Lookup Started: memberId=" + userId + ", teacherId=" + classId);
        ChatRoom existingRoom = chatRepository.findInstructorRoom(userId, classId);
        if (existingRoom != null) {
            System.out.println("Existing Room Found: roomId=" + existingRoom.getRoomId());
            return existingRoom;
        }

        System.out.println("No Existing Room Found: memberId=" + userId + ", teacherId=" + classId);

        long now = System.currentTimeMillis();
        String roomId = instructorRoomId(userId, classId);

        System.out.println("Room Creation Started: roomId=" + roomId);
        ChatRoom room = new ChatRoom();
        room.setRoomId(roomId);
        room.setMemberId(userId);
        room.setTeacherId(classId);
        room.setPartnerName(resolveInstructorName(instructorName, classId));
        room.setPartnerRole("INSTRUCTOR");
        room.setLastMessage("");
        room.setCreatedAt(now);
        room.setLastMessageAt(null);
        room.setUnreadMessageTeacher(false);
        room.setUnreadMessageMember(false);

        try {
            chatRepository.saveRoom(room);
            ChatRoom savedRoom = chatRepository.findRoomById(roomId);
            if (savedRoom == null || savedRoom.getRoomId() == null || savedRoom.getRoomId().isBlank()) {
                throw new IllegalStateException("Created room document is missing or invalid: " + roomId);
            }

            System.out.println("Room Creation Success: roomId=" + savedRoom.getRoomId());
            return savedRoom;
        } catch (RuntimeException e) {
            System.out.println("Room Creation Failed: " + e.getMessage());
            throw e;
        }
    }

    public List<ChatRoom> getRooms(String userId) {
        validateUserId(userId);
        System.out.println("Chat Room Load Started: userId=" + userId);
        List<ChatRoom> rooms = chatRepository.findAllRooms();
        System.out.println("Rooms Loaded: " + rooms.size());
        return rooms;
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
        boolean isSupportSender = SUPPORT_ID.equals(userId);
        boolean isInstructorRoom = room.getTeacherId() != null && !room.getTeacherId().isBlank();
        boolean isTeacherSender = userId.equals(room.getTeacherId());

        ChatMessage message = new ChatMessage();
        message.setRoomId(roomId);
        message.setSenderId(userId);
        message.setSenderType(isTeacherSender ? "INSTRUCTOR" : isSupportSender ? "SUPPORT" : "USER");
        message.setMessage(messageText);
        message.setCreatedAt(now);
        message.setIsRead(false);

        ChatMessage savedMessage = chatRepository.saveMessage(message);

        room.setLastMessage(messageText);
        room.setLastMessageAt(now);
        if (isInstructorRoom) {
            room.setUnreadMessageTeacher(!isTeacherSender);
            room.setUnreadMessageMember(isTeacherSender);
        } else {
            room.setUnreadMessageSupport(!isSupportSender);
            room.setUnreadMessageMember(isSupportSender);
        }
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

        if (!userId.equals(room.getMemberId())
                && !userId.equals(room.getSupportId())
                && !userId.equals(room.getTeacherId())) {
            throw new SecurityException("접근할 수 없는 채팅방입니다.");
        }

        return room;
    }

    private String supportRoomId(String userId) {
        return "support_" + userId;
    }

    private String instructorRoomId(String userId, String classId) {
        String key = userId + ":" + classId;
        return "instructor_" + UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8));
    }

    private void validateUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
    }

    private void validateClassId(String classId) {
        if (classId == null || classId.isBlank()) {
            throw new IllegalArgumentException("강사 정보를 찾을 수 없습니다.");
        }
    }

    private String resolveInstructorName(String instructorName, String classId) {
        if (instructorName == null || instructorName.isBlank()) {
            return classId;
        }

        return instructorName;
    }
}
