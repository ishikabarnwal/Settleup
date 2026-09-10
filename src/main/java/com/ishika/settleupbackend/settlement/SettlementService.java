package com.ishika.settleupbackend.settlement;

import com.ishika.settleupbackend.exception.BadRequestException;
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

    /** The shortest set of payments that would bring the whole group back to zero. */
    public List<SuggestedPayment> suggestPayments(Long groupId) {
        Group group = groupService.requireMembership(groupId, currentUser.require());

        Map<Long, User> membersById = membersById(group);

        return SettlementPlanner.plan(balanceService.netMinorByUserId(group)).stream()
                .map(payment -> new SuggestedPayment(
                        UserResponse.from(membersById.get(payment.fromUserId())),
                        UserResponse.from(membersById.get(payment.toUserId())),
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
