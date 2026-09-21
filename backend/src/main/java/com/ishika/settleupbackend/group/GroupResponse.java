package com.ishika.settleupbackend.group;

import java.time.Instant;

public record GroupResponse(
        Long id, String name, String description, Long createdBy, Instant createdAt, int memberCount) {

    public static GroupResponse from(Group group) {
        return new GroupResponse(
                group.getId(),
                group.getName(),
                group.getDescription(),
                group.getCreatedBy().getId(),
                group.getCreatedAt(),
                group.getMembers().size());
    }
}
