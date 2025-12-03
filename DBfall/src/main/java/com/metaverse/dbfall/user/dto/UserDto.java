package com.metaverse.dbfall.user.dto;

import com.metaverse.dbfall.user.User;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class UserDto {
    public Long id;
    public String username;
    public LocalDate birthDate;
    public LocalDateTime createdAt;

    public static UserDto from(User u) {
        UserDto dto = new UserDto();
        dto.id = u.getId();
        dto.username = u.getUsername();
        dto.birthDate = u.getBirthDate();
        dto.createdAt = u.getCreatedAt();
        return dto;
    }
}
