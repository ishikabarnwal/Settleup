package com.ishika.settleupbackend.settlement;

import com.ishika.settleupbackend.expense.Expense;
import com.ishika.settleupbackend.expense.ExpenseRepository;
import com.ishika.settleupbackend.expense.ExpenseShare;
import com.ishika.settleupbackend.expense.MoneySplitter;
import com.ishika.settleupbackend.group.Group;
import com.ishika.settleupbackend.group.GroupService;
import com.ishika.settleupbackend.security.CurrentUser;
import com.ishika.settleupbackend.user.User;
import com.ishika.settleupbackend.user.UserResponse;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Works out where everyone stands in a group.
 *
 * <p>Someone's net is what they have put in minus what they have taken out:
 * expenses they paid for, less their share of every expense, plus settlements
 * they have paid, less settlements they have received. Because every expense
 * splits into shares that add back up to its total, and every settlement moves
 * the same amount between two people, the nets across a group always add up to
 * zero.
 */
@Service
@Transactional(readOnly = true)
public class BalanceService {

    /** Indexes into the per-member running totals. */
    private static final int PAID = 0;
    private static final int SHARE = 1;
    private static final int SETTLED_OUT = 2;
    private static final int SETTLED_IN = 3;

    private final ExpenseRepository expenseRepository;
    private final SettlementRepository settlementRepository;
    private final GroupService groupService;
    private final CurrentUser currentUser;

    public BalanceService(
            ExpenseRepository expenseRepository,
            SettlementRepository settlementRepository,
            GroupService groupService,
            CurrentUser currentUser) {
        this.expenseRepository = expenseRepository;
        this.settlementRepository = settlementRepository;
        this.groupService = groupService;
        this.currentUser = currentUser;
    }

    public List<MemberBalance> balancesFor(Long groupId) {
        Group group = groupService.requireMembership(groupId, currentUser.require());
        return balancesFor(group);
    }

    public List<MemberBalance> balancesFor(Group group) {
        Map<Long, long[]> totals = totalsFor(group);
        Map<Long, User> membersById = membersById(group);

        List<MemberBalance> balances = new ArrayList<>();

        totals.forEach((userId, totals4) -> balances.add(new MemberBalance(
                UserResponse.from(membersById.get(userId)),
                MoneySplitter.fromMinorUnits(totals4[PAID]),
                MoneySplitter.fromMinorUnits(totals4[SHARE]),
                MoneySplitter.fromMinorUnits(totals4[SETTLED_OUT]),
                MoneySplitter.fromMinorUnits(totals4[SETTLED_IN]),
                MoneySplitter.fromMinorUnits(net(totals4)))));

        balances.sort(Comparator.comparing(balance -> balance.user().id()));

        return balances;
    }

    /** Net position per member in minor units, which is what the planner works on. */
    public Map<Long, Long> netMinorByUserId(Group group) {
        Map<Long, Long> nets = new LinkedHashMap<>();
        totalsFor(group).forEach((userId, totals) -> nets.put(userId, net(totals)));
        return nets;
    }

    private Map<Long, long[]> totalsFor(Group group) {
        Map<Long, long[]> totals = new LinkedHashMap<>();
        membersById(group).keySet().forEach(userId -> totals.put(userId, new long[4]));

        for (Expense expense : expenseRepository.findAllForGroup(group.getId())) {
            totalsFor(totals, expense.getPaidBy().getId())[PAID] += MoneySplitter.toMinorUnits(expense.getAmount());

            for (ExpenseShare share : expense.getShares()) {
                totalsFor(totals, share.getUser().getId())[SHARE] += MoneySplitter.toMinorUnits(share.getAmount());
            }
        }

        for (Settlement settlement : settlementRepository.findAllForGroup(group.getId())) {
            long amount = MoneySplitter.toMinorUnits(settlement.getAmount());
            totalsFor(totals, settlement.getPaidBy().getId())[SETTLED_OUT] += amount;
            totalsFor(totals, settlement.getPaidTo().getId())[SETTLED_IN] += amount;
        }

        return totals;
    }

    private long[] totalsFor(Map<Long, long[]> totals, Long userId) {
        return totals.computeIfAbsent(userId, key -> new long[4]);
    }

    private long net(long[] totals) {
        return totals[PAID] - totals[SHARE] + totals[SETTLED_OUT] - totals[SETTLED_IN];
    }

    private Map<Long, User> membersById(Group group) {
        Map<Long, User> membersById = new LinkedHashMap<>();
        group.getMembers().forEach(member -> membersById.put(member.getId(), member));
        return membersById;
    }
}
