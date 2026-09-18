package com.ishika.settleupbackend.group;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record GroupDetailResponse(
        Long id,
        String name,
        String description,
        Long createdBy,
        Instant createdAt,
        List<GroupMemberResponse> members) {

    public static GroupDetailResponse from(Group group) {
        List<GroupMemberResponse> members = group.getMembers().stream()
                .sorted(Comparator.comparing(user -> user.getId()))
                .map(user -> GroupMemberResponse.from(user, group))
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
