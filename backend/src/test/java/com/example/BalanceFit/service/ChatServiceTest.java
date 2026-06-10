package com.example.BalanceFit.service;

import com.example.BalanceFit.entity.ChatRoom;
import com.example.BalanceFit.repository.ChatRepository;
import org.junit.jupiter.api.Test;

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

    private static class FakeChatRepository extends ChatRepository {
        private ChatRoom instructorRoom;
        private ChatRoom savedRoom;
        private int saveCount;

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
        public void saveRoom(ChatRoom room) {
            saveCount++;
            savedRoom = room;
        }

        @Override
        public ChatRoom findRoomById(String roomId) {
            if (savedRoom != null && roomId.equals(savedRoom.getRoomId())) {
                return savedRoom;
            }

            return null;
        }
    }
}
