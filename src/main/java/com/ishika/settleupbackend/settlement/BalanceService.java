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
import java.math.BigDecimal;
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
 *
 * <p>Nothing here is stored. Balances are rebuilt from the expenses and
 * settlements on every call, so deleting either one can never leave them stale.
 *
 * <p>The history can mention people who have since been removed from the group.
 * Removal is only allowed at a zero balance, so they are left out of the result
 * unless something has put them back in the red or black.
 */
@Service
@Transactional(readOnly = true)
public class BalanceService {

    /** Indexes into the per-person running totals. */
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
        Map<Long, User> people = new LinkedHashMap<>();
        group.getMembers().forEach(member -> people.put(member.getId(), member));

        Map<Long, long[]> totals = new LinkedHashMap<>();
        people.keySet().forEach(userId -> totals.put(userId, new long[4]));

        for (Expense expense : expenseRepository.findAllForGroup(group.getId())) {
            add(totals, people, expense.getPaidBy(), PAID, expense.getAmount());

            for (ExpenseShare share : expense.getShares()) {
                add(totals, people, share.getUser(), SHARE, share.getAmount());
            }
        }

        for (Settlement settlement : settlementRepository.findAllForGroup(group.getId())) {
            add(totals, people, settlement.getPaidBy(), SETTLED_OUT, settlement.getAmount());
            add(totals, people, settlement.getPaidTo(), SETTLED_IN, settlement.getAmount());
        }

        List<MemberBalance> balances = new ArrayList<>();

        totals.forEach((userId, sums) -> {
            long net = sums[PAID] - sums[SHARE] + sums[SETTLED_OUT] - sums[SETTLED_IN];
            if (net == 0 && !group.hasMember(people.get(userId))) {
                return;
            }

            balances.add(new MemberBalance(
                    UserResponse.from(people.get(userId)),
                    MoneySplitter.fromMinorUnits(sums[PAID]),
                    MoneySplitter.fromMinorUnits(sums[SHARE]),
                    MoneySplitter.fromMinorUnits(sums[SETTLED_OUT]),
                    MoneySplitter.fromMinorUnits(sums[SETTLED_IN]),
                    MoneySplitter.fromMinorUnits(net)));
        });

        balances.sort(Comparator.comparing(balance -> balance.user().id()));

        return balances;
    }

    /** One person's net in the group, zero if they have no history there. */
    public long netMinorFor(Group group, Long userId) {
        return balancesFor(group).stream()
                .filter(balance -> balance.user().id().equals(userId))
                .findFirst()
                .map(balance -> MoneySplitter.toMinorUnits(balance.net()))
                .orElse(0L);
    }

    private void add(Map<Long, long[]> totals, Map<Long, User> people, User user, int column, BigDecimal amount) {
        people.putIfAbsent(user.getId(), user);
        totals.computeIfAbsent(user.getId(), key -> new long[4])[column] += MoneySplitter.toMinorUnits(amount);
    }
}
