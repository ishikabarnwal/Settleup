package com.ishika.settleupbackend.expense;

import com.ishika.settleupbackend.user.UserResponse;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

public record ExpenseResponse(
        Long id,
        Long groupId,
        String description,
        BigDecimal amount,
        UserResponse paidBy,
        SplitType splitType,
        Instant createdAt,
        List<ShareResponse> shares) {

    public record ShareResponse(UserResponse user, BigDecimal amount) {}

    public static ExpenseResponse from(Expense expense) {
        List<ShareResponse> shares = expense.getShares().stream()
                .sorted(Comparator.comparing(share -> share.getUser().getId()))
                .map(share -> new ShareResponse(UserResponse.from(share.getUser()), share.getAmount()))
                .toList();

        return new ExpenseResponse(
                expense.getId(),
                expense.getGroup().getId(),
                expense.getDescription(),
                expense.getAmount(),
                UserResponse.from(expense.getPaidBy()),
                expense.getSplitType(),
                expense.getCreatedAt(),
                shares);
    }
}
