package com.ishika.settleupbackend.expense;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/**
 * EQUAL uses participantIds and falls back to the whole group when it is left
 * out. EXACT uses shares, which have to add up to the amount.
 */
public record CreateExpenseRequest(
        @NotBlank(message = "description is required")
        @Size(max = 200, message = "description must be at most 200 characters")
        String description,

        @NotNull(message = "amount is required")
        @Positive(message = "amount must be greater than zero")
        BigDecimal amount,

        @NotNull(message = "paidBy is required") Long paidBy,

        @NotNull(message = "splitType is required") SplitType splitType,

        List<Long> participantIds,

        @Valid List<ShareInput> shares) {}
