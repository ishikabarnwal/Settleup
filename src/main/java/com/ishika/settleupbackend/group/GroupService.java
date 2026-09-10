package com.ishika.settleupbackend.group;

import com.ishika.settleupbackend.exception.BadRequestException;
import com.ishika.settleupbackend.exception.NotFoundException;
import com.ishika.settleupbackend.security.CurrentUser;
import com.ishika.settleupbackend.user.User;
import com.ishika.settleupbackend.user.UserRepository;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class GroupService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final CurrentUser currentUser;

    public GroupService(
            GroupRepository groupRepository, UserRepository userRepository, CurrentUser currentUser) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    @Transactional
    public GroupResponse create(CreateGroupRequest request) {
        User creator = currentUser.require();
        String description = request.description() == null ? null : request.description().trim();

        Group group = new Group(request.name().trim(), description, creator);
        groupRepository.save(group);

        return GroupResponse.from(group);
    }

    public List<GroupResponse> listMyGroups() {
        return groupRepository.findAllForMember(currentUser.requireId()).stream()
                .map(GroupResponse::from)
                .toList();
    }

    public GroupDetailResponse getDetail(Long groupId) {
        return GroupDetailResponse.from(requireMembership(groupId, currentUser.require()));
    }

    @Transactional
    public GroupDetailResponse addMember(Long groupId, AddMemberRequest request) {
        Group group = requireMembership(groupId, currentUser.require());

        String email = request.email().trim().toLowerCase();
        User invitee = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundException("No user is registered with " + email));

        if (!group.addMember(invitee)) {
            throw new BadRequestException(invitee.getName() + " is already in this group");
        }

        return GroupDetailResponse.from(group);
    }

    /**
     * Loads a group and checks the caller belongs to it. Every group-scoped feature
     * goes through here so the membership rule lives in one place.
     */
    public Group requireMembership(Long groupId, User user) {
        Group group = groupRepository
                .findByIdWithMembers(groupId)
                .orElseThrow(() -> new NotFoundException("Group " + groupId + " not found"));

        if (!group.hasMember(user)) {
            throw new AccessDeniedException("You are not a member of this group");
        }

        return group;
    }
}
