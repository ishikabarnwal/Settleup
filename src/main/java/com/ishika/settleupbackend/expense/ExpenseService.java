package com.ishika.settleupbackend.expense;

import com.ishika.settleupbackend.exception.BadRequestException;
import com.ishika.settleupbackend.exception.NotFoundException;
import com.ishika.settleupbackend.group.Group;
import com.ishika.settleupbackend.group.GroupService;
import com.ishika.settleupbackend.security.CurrentUser;
import com.ishika.settleupbackend.user.User;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final GroupService groupService;
    private final CurrentUser currentUser;

    public ExpenseService(
            ExpenseRepository expenseRepository, GroupService groupService, CurrentUser currentUser) {
        this.expenseRepository = expenseRepository;
        this.groupService = groupService;
        this.currentUser = currentUser;
    }

    @Transactional
    public ExpenseResponse create(Long groupId, CreateExpenseRequest request) {
        User caller = currentUser.require();
        Group group = groupService.requireMembership(groupId, caller);

        Map<Long, User> membersById = group.getMembers().stream()
                .collect(Collectors.toMap(User::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));

        BigDecimal amount = MoneySplitter.normalise(request.amount());

        User payer = membersById.get(request.paidBy());
        if (payer == null) {
            throw new BadRequestException("The payer must be a member of this group");
        }

        Map<Long, BigDecimal> shares = switch (request.splitType()) {
            case EQUAL -> equalShares(request, amount, membersById);
            case EXACT -> exactShares(request, amount, membersById);
        };

        Expense expense = new Expense(
                group, request.description().trim(), amount, payer, request.splitType(), caller);
        shares.forEach((userId, share) -> expense.addShare(membersById.get(userId), share));

        expenseRepository.save(expense);

        return ExpenseResponse.from(expense);
    }

    public List<ExpenseResponse> listForGroup(Long groupId) {
        groupService.requireMembership(groupId, currentUser.require());

        return expenseRepository.findAllForGroup(groupId).stream()
                .map(ExpenseResponse::from)
                .toList();
    }

    public ExpenseResponse getOne(Long groupId, Long expenseId) {
        groupService.requireMembership(groupId, currentUser.require());

        Expense expense = expenseRepository
                .findByIdWithShares(expenseId)
                .orElseThrow(() -> new NotFoundException("Expense " + expenseId + " not found"));

        if (!expense.getGroup().getId().equals(groupId)) {
            throw new NotFoundException("Expense " + expenseId + " is not in group " + groupId);
        }

        return ExpenseResponse.from(expense);
    }

    private Map<Long, BigDecimal> equalShares(
            CreateExpenseRequest request, BigDecimal amount, Map<Long, User> membersById) {

        if (request.shares() != null && !request.shares().isEmpty()) {
            throw new BadRequestException("shares only applies to an EXACT split, use participantIds for EQUAL");
        }

        List<Long> participantIds = request.participantIds() == null || request.participantIds().isEmpty()
                ? new ArrayList<>(membersById.keySet())
                : distinctMembers(request.participantIds(), membersById, "participantIds");

        return MoneySplitter.splitEqually(amount, participantIds);
    }

    private Map<Long, BigDecimal> exactShares(
            CreateExpenseRequest request, BigDecimal amount, Map<Long, User> membersById) {

        if (request.participantIds() != null && !request.participantIds().isEmpty()) {
            throw new BadRequestException("participantIds only applies to an EQUAL split, use shares for EXACT");
        }
        if (request.shares() == null || request.shares().isEmpty()) {
            throw new BadRequestException("An EXACT split needs at least one share");
        }

        distinctMembers(request.shares().stream().map(ShareInput::userId).toList(), membersById, "shares");

        Map<Long, BigDecimal> shares = new LinkedHashMap<>();
        long totalMinor = 0;

        for (ShareInput share : request.shares()) {
            long minor = MoneySplitter.toMinorUnits(share.amount());
            totalMinor += minor;
            shares.put(share.userId(), MoneySplitter.fromMinorUnits(minor));
        }

        long expectedMinor = MoneySplitter.toMinorUnits(amount);
        if (totalMinor != expectedMinor) {
            throw new BadRequestException("Shares add up to %s but the expense is %s"
                    .formatted(MoneySplitter.fromMinorUnits(totalMinor), amount));
        }

        return shares;
    }

    /** Every participant has to be in the group, and nobody can appear twice. */
    private List<Long> distinctMembers(List<Long> userIds, Map<Long, User> membersById, String field) {
        Set<Long> seen = new LinkedHashSet<>();

        for (Long userId : userIds) {
            if (userId == null) {
                throw new BadRequestException(field + " cannot contain a null user id");
            }
            if (!membersById.containsKey(userId)) {
                throw new BadRequestException("User " + userId + " is not a member of this group");
            }
            if (!seen.add(userId)) {
                throw new BadRequestException("User " + userId + " appears more than once in " + field);
            }
        }

        if (seen.isEmpty()) {
            throw new BadRequestException("An expense needs at least one participant");
        }

        return new ArrayList<>(seen);
    }
}
