package com.example.BalanceFit.entity;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ChatMessage {
    private String messageId;
    private String roomId;
    private String senderId;
    private String senderType;
    private String message;
    private Long createdAt;
    private Boolean isRead;
}
