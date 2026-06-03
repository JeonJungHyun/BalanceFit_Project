package com.example.BalanceFit.entity;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class Class {
    private String classId;
    private String title;
    private String instructor;

    private String startTime;

    private int maxCapacity;
    private int currentReservations;
}
