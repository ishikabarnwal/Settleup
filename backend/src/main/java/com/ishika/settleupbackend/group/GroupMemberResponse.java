package com.ishika.settleupbackend.group;

import com.ishika.settleupbackend.user.User;

public record GroupMemberResponse(Long id, String name, String email, GroupRole role) {

    static GroupMemberResponse from(User user, Group group) {
        return new GroupMemberResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                group.isOwnedBy(user) ? GroupRole.OWNER : GroupRole.MEMBER);
    }
}
