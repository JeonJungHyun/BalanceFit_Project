package com.example.BalanceFit.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ChatInstructorRoomRequest {
    private String classId;
    private String instructorName;
}
