package com.example.BalanceFit.repository;

import com.example.BalanceFit.entity.ChatMessage;
import com.example.BalanceFit.entity.ChatRoom;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class ChatRepository {

    private static final String CHAT_ROOMS = "chatRooms";
    private static final String CHAT_MESSAGES = "chatMessages";

    private final Firestore firestore;

    public ChatRoom findRoomById(String roomId) {
        try {
            return firestore.collection(CHAT_ROOMS)
                    .document(roomId)
                    .get()
                    .get()
                    .toObject(ChatRoom.class);
        } catch (Exception e) {
            throw new RuntimeException("채팅방 조회 실패: " + roomId, e);
        }
    }

    public void saveRoom(ChatRoom room) {
        try {
            firestore.collection(CHAT_ROOMS)
                    .document(room.getRoomId())
                    .set(room)
                    .get();
        } catch (Exception e) {
            throw new RuntimeException("채팅방 저장 실패: " + room.getRoomId(), e);
        }
    }

    public ChatRoom findInstructorRoom(String memberId, String teacherId) {
        try {
            List<QueryDocumentSnapshot> documents = firestore.collection(CHAT_ROOMS)
                    .whereEqualTo("memberId", memberId)
                    .whereEqualTo("teacherId", teacherId)
                    .limit(1)
                    .get()
                    .get()
                    .getDocuments();

            if (documents.isEmpty()) {
                return null;
            }

            return documents.get(0).toObject(ChatRoom.class);
        } catch (Exception e) {
            throw new RuntimeException("강사 상담방 조회 실패: " + memberId + ", " + teacherId, e);
        }
    }

    public List<ChatRoom> findAllRooms() {
        try {
            System.out.println("Firestore Query Started: chatRooms");
            List<ChatRoom> rooms = firestore.collection(CHAT_ROOMS)
                    .get()
                    .get()
                    .toObjects(ChatRoom.class)
                    .stream()
                    .sorted(Comparator.comparing(ChatRoom::getLastMessageAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
            System.out.println("Firestore Query Success: chatRooms size=" + rooms.size());
            return rooms;
        } catch (Exception e) {
            throw new RuntimeException("채팅방 전체 목록 조회 실패", e);
        }
    }

    public List<ChatRoom> findRoomsByMemberId(String memberId) {
        try {
            return firestore.collection(CHAT_ROOMS)
                    .whereEqualTo("memberId", memberId)
                    .get()
                    .get()
                    .toObjects(ChatRoom.class)
                    .stream()
                    .sorted(Comparator.comparing(ChatRoom::getLastMessageAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
        } catch (Exception e) {
            throw new RuntimeException("회원 채팅방 목록 조회 실패: " + memberId, e);
        }
    }

    public List<ChatRoom> findRoomsBySupportId(String supportId) {
        try {
            return firestore.collection(CHAT_ROOMS)
                    .whereEqualTo("supportId", supportId)
                    .get()
                    .get()
                    .toObjects(ChatRoom.class)
                    .stream()
                    .sorted(Comparator.comparing(ChatRoom::getLastMessageAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
        } catch (Exception e) {
            throw new RuntimeException("상담 채팅방 목록 조회 실패: " + supportId, e);
        }
    }

    public List<ChatMessage> findMessagesByRoomId(String roomId) {
        try {
            return firestore.collection(CHAT_MESSAGES)
                    .whereEqualTo("roomId", roomId)
                    .get()
                    .get()
                    .toObjects(ChatMessage.class)
                    .stream()
                    .sorted(Comparator.comparing(ChatMessage::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
        } catch (Exception e) {
            throw new RuntimeException("채팅 메시지 조회 실패: " + roomId, e);
        }
    }

    public ChatMessage saveMessage(ChatMessage message) {
        try {
            String messageId = message.getMessageId();
            DocumentReference documentReference = messageId == null || messageId.isBlank()
                    ? firestore.collection(CHAT_MESSAGES).document(UUID.randomUUID().toString())
                    : firestore.collection(CHAT_MESSAGES).document(messageId);

            message.setMessageId(documentReference.getId());
            documentReference.set(message).get();
            return message;
        } catch (Exception e) {
            throw new RuntimeException("채팅 메시지 저장 실패", e);
        }
    }

    public void markRoomReadForUser(ChatRoom room, String userId) {
        try {
            if (room.getMemberId().equals(userId)) {
                firestore.collection(CHAT_ROOMS)
                        .document(room.getRoomId())
                        .update("unreadMessageMember", false)
                        .get();
                return;
            }

            if (userId.equals(room.getSupportId())) {
                firestore.collection(CHAT_ROOMS)
                        .document(room.getRoomId())
                        .update("unreadMessageSupport", false)
                        .get();
                return;
            }

            if (userId.equals(room.getTeacherId())) {
                firestore.collection(CHAT_ROOMS)
                        .document(room.getRoomId())
                        .update("unreadMessageTeacher", false)
                        .get();
            }
        } catch (Exception e) {
            throw new RuntimeException("채팅방 읽음 처리 실패: " + room.getRoomId(), e);
        }
    }
}
