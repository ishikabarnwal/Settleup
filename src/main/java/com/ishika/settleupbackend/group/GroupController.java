package com.ishika.settleupbackend.group;

import com.ishika.settleupbackend.settlement.MemberRemovalService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;
    private final MemberRemovalService memberRemovalService;

    public GroupController(GroupService groupService, MemberRemovalService memberRemovalService) {
        this.groupService = groupService;
        this.memberRemovalService = memberRemovalService;
    }

    @PostMapping
    public ResponseEntity<GroupResponse> create(@Valid @RequestBody CreateGroupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(groupService.create(request));
    }

    @GetMapping
    public List<GroupResponse> myGroups() {
        return groupService.listMyGroups();
    }

    @GetMapping("/{groupId}")
    public GroupDetailResponse detail(@PathVariable Long groupId) {
        return groupService.getDetail(groupId);
    }

    @PostMapping("/{groupId}/members")
    public GroupDetailResponse addMember(
            @PathVariable Long groupId, @Valid @RequestBody AddMemberRequest request) {
        return groupService.addMember(groupId, request);
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    public GroupDetailResponse removeMember(@PathVariable Long groupId, @PathVariable Long userId) {
        return memberRemovalService.removeMember(groupId, userId);
    }
}
