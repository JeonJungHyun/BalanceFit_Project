package com.example.BalanceFit.entity;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class User {
    private String userId;
    private String name;
    private String email;
    private String password;
}
