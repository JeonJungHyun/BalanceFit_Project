package com.example.BalanceFit.entity;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ChatRoom {
    private String roomId;
    private String roomTitle;
    private String memberId;
    private String supportId;
    private String teacherId;
    private String instructorId;
    private String partnerName;
    private String partnerRole;
    private String lastMessage;
    private Long createdAt;
    private Long lastMessageAt;
    private Boolean unreadMember;
    private Boolean unreadInstructor;
    private Boolean unreadMessageSupport;
    private Boolean unreadMessageTeacher;
    private Boolean unreadMessageMember;
}
