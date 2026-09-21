package com.ishika.settleupbackend.settlement;

import com.ishika.settleupbackend.exception.BadRequestException;
import com.ishika.settleupbackend.exception.NotFoundException;
import com.ishika.settleupbackend.expense.MoneySplitter;
import com.ishika.settleupbackend.group.Group;
import com.ishika.settleupbackend.group.GroupService;
import com.ishika.settleupbackend.security.CurrentUser;
import com.ishika.settleupbackend.user.User;
import com.ishika.settleupbackend.user.UserResponse;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class SettlementService {

    private final SettlementRepository settlementRepository;
    private final BalanceService balanceService;
    private final GroupService groupService;
    private final CurrentUser currentUser;

    public SettlementService(
            SettlementRepository settlementRepository,
            BalanceService balanceService,
            GroupService groupService,
            CurrentUser currentUser) {
        this.settlementRepository = settlementRepository;
        this.balanceService = balanceService;
        this.groupService = groupService;
        this.currentUser = currentUser;
    }

    @Transactional
    public SettlementResponse record(Long groupId, CreateSettlementRequest request) {
        User caller = currentUser.require();
        Group group = groupService.requireMembership(groupId, caller);

        if (request.paidBy().equals(request.paidTo())) {
            throw new BadRequestException("A settlement needs two different people");
        }

        Map<Long, User> membersById = membersById(group);
        User payer = member(membersById, request.paidBy(), "paidBy");
        User receiver = member(membersById, request.paidTo(), "paidTo");

        BigDecimal amount = MoneySplitter.normalise(request.amount());
        String note = request.note() == null || request.note().isBlank() ? null : request.note().trim();

        Settlement settlement = new Settlement(group, payer, receiver, amount, note, caller);
        settlementRepository.save(settlement);

        return SettlementResponse.from(settlement);
    }

    public List<SettlementResponse> listForGroup(Long groupId) {
        groupService.requireMembership(groupId, currentUser.require());

        return settlementRepository.findAllForGroup(groupId).stream()
                .map(SettlementResponse::from)
                .toList();
    }

    /**
     * Balances are worked out from the history on every read, so removing a
     * settlement is all it takes to undo it.
     */
    @Transactional
    public void delete(Long groupId, Long settlementId) {
        Group group = groupService.requireMembership(groupId, currentUser.require());

        Settlement settlement = settlementRepository
                .findById(settlementId)
                .filter(found -> found.getGroup().getId().equals(groupId))
                .orElseThrow(() -> new NotFoundException(
                        "Settlement " + settlementId + " not found in group " + groupId));

        groupService.requireStillMembers(group, "settlement", settlement.getPaidBy(), settlement.getPaidTo());

        settlementRepository.delete(settlement);
    }

    /** The shortest set of payments that would bring the whole group back to zero. */
    public List<SuggestedPayment> suggestPayments(Long groupId) {
        Group group = groupService.requireMembership(groupId, currentUser.require());

        Map<Long, UserResponse> usersById = new LinkedHashMap<>();
        Map<Long, Long> netByUserId = new LinkedHashMap<>();

        for (MemberBalance balance : balanceService.balancesFor(group)) {
            usersById.put(balance.user().id(), balance.user());
            netByUserId.put(balance.user().id(), MoneySplitter.toMinorUnits(balance.net()));
        }

        return SettlementPlanner.plan(netByUserId).stream()
                .map(payment -> new SuggestedPayment(
                        usersById.get(payment.fromUserId()),
                        usersById.get(payment.toUserId()),
                        MoneySplitter.fromMinorUnits(payment.amountMinor())))
                .toList();
    }

    private User member(Map<Long, User> membersById, Long userId, String field) {
        User user = membersById.get(userId);
        if (user == null) {
            throw new BadRequestException(field + " must be a member of this group");
        }
        return user;
    }

    private Map<Long, User> membersById(Group group) {
        Map<Long, User> membersById = new LinkedHashMap<>();
        group.getMembers().forEach(member -> membersById.put(member.getId(), member));
        return membersById;
    }
}
