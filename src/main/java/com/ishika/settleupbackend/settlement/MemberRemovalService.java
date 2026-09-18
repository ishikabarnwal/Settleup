package com.ishika.settleupbackend.settlement;

import com.ishika.settleupbackend.exception.BadRequestException;
import com.ishika.settleupbackend.exception.NotFoundException;
import com.ishika.settleupbackend.expense.MoneySplitter;
import com.ishika.settleupbackend.group.Group;
import com.ishika.settleupbackend.group.GroupDetailResponse;
import com.ishika.settleupbackend.group.GroupService;
import com.ishika.settleupbackend.security.CurrentUser;
import com.ishika.settleupbackend.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Taking someone out of a group. This lives next to the balances rather than in
 * GroupService because the rule is about money: a member can only go once they
 * are square, otherwise whatever they owe or are owed would vanish with them.
 * Their past expenses and settlements stay in the history.
 */
@Service
public class MemberRemovalService {

    private final GroupService groupService;
    private final BalanceService balanceService;
    private final CurrentUser currentUser;

    public MemberRemovalService(GroupService groupService, BalanceService balanceService, CurrentUser currentUser) {
        this.groupService = groupService;
        this.balanceService = balanceService;
        this.currentUser = currentUser;
    }

    @Transactional
    public GroupDetailResponse removeMember(Long groupId, Long userId) {
        Group group = groupService.requireMembership(groupId, currentUser.require());

        User member = group.getMembers().stream()
                .filter(candidate -> candidate.getId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("User " + userId + " is not a member of this group"));

        long net = balanceService.netMinorFor(group, userId);
        if (net != 0) {
            throw new BadRequestException(
                    "%s can't be removed while their balance in this group is %s. Settle up first."
                            .formatted(member.getName(), MoneySplitter.fromMinorUnits(net)));
        }

        group.removeMember(userId);

        return GroupDetailResponse.from(group);
    }
}
