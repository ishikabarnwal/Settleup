package com.ishika.settleupbackend.group;

import com.ishika.settleupbackend.user.UserResponse;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record GroupDetailResponse(
        Long id,
        String name,
        String description,
        Long createdBy,
        Instant createdAt,
        List<UserResponse> members) {

    public static GroupDetailResponse from(Group group) {
        List<UserResponse> members = group.getMembers().stream()
                .sorted(Comparator.comparing(user -> user.getId()))
                .map(UserResponse::from)
                .toList();

        return new GroupDetailResponse(
                group.getId(),
                group.getName(),
                group.getDescription(),
                group.getCreatedBy().getId(),
                group.getCreatedAt(),
                members);
    }
}
