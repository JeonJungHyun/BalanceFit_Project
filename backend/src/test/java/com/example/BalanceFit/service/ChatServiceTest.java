package com.example.BalanceFit.service;

import com.example.BalanceFit.entity.ChatRoom;
import com.example.BalanceFit.entity.ChatMessage;
import com.example.BalanceFit.repository.ChatRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ChatServiceTest {

    @Test
    void getOrCreateInstructorRoomReturnsExistingRoomWithoutCreatingDuplicate() {
        FakeChatRepository chatRepository = new FakeChatRepository();
        ChatService chatService = new ChatService(chatRepository, new ChatStreamService());

        ChatRoom existingRoom = new ChatRoom();
        existingRoom.setRoomId("instructor-existing");
        existingRoom.setMemberId("member-1");
        existingRoom.setTeacherId("class-1");
        chatRepository.instructorRoom = existingRoom;

        ChatRoom result = chatService.getOrCreateInstructorRoom("member-1", "class-1", "강사");

        assertEquals("instructor-existing", result.getRoomId());
        assertEquals(0, chatRepository.saveCount);
    }

    @Test
    void getOrCreateInstructorRoomCreatesAndVerifiesNewRoom() {
        FakeChatRepository chatRepository = new FakeChatRepository();
        ChatService chatService = new ChatService(chatRepository, new ChatStreamService());

        ChatRoom result = chatService.getOrCreateInstructorRoom("member-1", "class-1", "강사");

        assertNotNull(result.getRoomId());
        assertEquals("member-1", result.getMemberId());
        assertEquals("class-1", result.getTeacherId());
        assertEquals(1, chatRepository.saveCount);
    }

    @Test
    void getOrCreateChatbotRoomReturnsExistingRoomWithoutCreatingDuplicateOrGreeting() {
        FakeChatRepository chatRepository = new FakeChatRepository();
        ChatService chatService = new ChatService(chatRepository, new ChatStreamService());

        ChatRoom existingRoom = new ChatRoom();
        existingRoom.setRoomId("chatbot-existing");
        existingRoom.setRoomTitle("챗봇");
        existingRoom.setMemberId("member-1");
        existingRoom.setInstructorId("CHATBOT");
        chatRepository.chatbotRoom = existingRoom;

        ChatRoom result = chatService.getOrCreateChatbotRoom("member-1");

        assertEquals("chatbot-existing", result.getRoomId());
        assertEquals(0, chatRepository.chatbotSaveCount);
        assertEquals(0, chatRepository.savedMessages.size());
    }

    @Test
    void getOrCreateChatbotRoomCreatesRoomAndInitialGreetingOnce() {
        FakeChatRepository chatRepository = new FakeChatRepository();
        ChatService chatService = new ChatService(chatRepository, new ChatStreamService());

        ChatRoom result = chatService.getOrCreateChatbotRoom("member-1");

        assertNotNull(result.getRoomId());
        assertEquals("챗봇", result.getRoomTitle());
        assertEquals("member-1", result.getMemberId());
        assertEquals("CHATBOT", result.getInstructorId());
        assertEquals(false, result.getUnreadMember());
        assertEquals(false, result.getUnreadInstructor());
        assertEquals(1, chatRepository.chatbotSaveCount);
        assertEquals(1, chatRepository.savedMessages.size());
        assertEquals("CHATBOT", chatRepository.savedMessages.get(0).getSenderId());
        assertEquals("CHATBOT", chatRepository.savedMessages.get(0).getSenderType());
        assertEquals("무엇을 도와드릴까요?", chatRepository.savedMessages.get(0).getMessage());

        chatRepository.chatbotRoom = result;
        ChatRoom reusedRoom = chatService.getOrCreateChatbotRoom("member-1");

        assertEquals(result.getRoomId(), reusedRoom.getRoomId());
        assertEquals(1, chatRepository.chatbotSaveCount);
        assertEquals(1, chatRepository.savedMessages.size());
    }

    @Test
    void getRoomsReturnsFirestoreRoomsNewestFirst() {
        FakeChatRepository chatRepository = new FakeChatRepository();
        ChatService chatService = new ChatService(chatRepository, new ChatStreamService());
        chatRepository.allRooms = new ArrayList<>(List.of(
                room("old-room", 100L),
                room("new-room", 300L),
                room("middle-room", 200L)
        ));

        List<ChatRoom> rooms = chatService.getRooms("member-1");

        assertEquals("new-room", rooms.get(0).getRoomId());
        assertEquals("middle-room", rooms.get(1).getRoomId());
        assertEquals("old-room", rooms.get(2).getRoomId());
    }

    private static ChatRoom room(String roomId, Long lastMessageAt) {
        ChatRoom room = new ChatRoom();
        room.setRoomId(roomId);
        room.setLastMessageAt(lastMessageAt);
        return room;
    }

    private static class FakeChatRepository extends ChatRepository {
        private ChatRoom instructorRoom;
        private ChatRoom chatbotRoom;
        private ChatRoom savedRoom;
        private List<ChatRoom> allRooms = List.of();
        private List<ChatMessage> savedMessages = new ArrayList<>();
        private int saveCount;
        private int chatbotSaveCount;

        FakeChatRepository() {
            super(null);
        }

        @Override
        public ChatRoom findInstructorRoom(String memberId, String teacherId) {
            if (instructorRoom == null) {
                return null;
            }

            if (memberId.equals(instructorRoom.getMemberId()) && teacherId.equals(instructorRoom.getTeacherId())) {
                return instructorRoom;
            }

            return null;
        }

        @Override
        public ChatRoom findChatbotRoom(String memberId, String instructorId) {
            if (chatbotRoom == null) {
                return null;
            }

            if (memberId.equals(chatbotRoom.getMemberId()) && instructorId.equals(chatbotRoom.getInstructorId())) {
                return chatbotRoom;
            }

            return null;
        }

        @Override
        public void saveRoom(ChatRoom room) {
            saveCount++;
            savedRoom = room;
        }

        @Override
        public void saveChatbotRoom(ChatRoom room) {
            chatbotSaveCount++;
            savedRoom = room;
        }

        @Override
        public ChatMessage saveMessage(ChatMessage message) {
            savedMessages.add(message);
            return message;
        }

        @Override
        public ChatRoom findRoomById(String roomId) {
            if (savedRoom != null && roomId.equals(savedRoom.getRoomId())) {
                return savedRoom;
            }

            return null;
        }

        @Override
        public List<ChatRoom> findAllRooms() {
            return allRooms.stream()
                    .sorted(Comparator.comparing(ChatRoom::getLastMessageAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
        }
    }
}
