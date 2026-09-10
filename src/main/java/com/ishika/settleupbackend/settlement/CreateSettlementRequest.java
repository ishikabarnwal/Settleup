package com.ishika.settleupbackend.settlement;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateSettlementRequest(
        @NotNull(message = "paidBy is required") Long paidBy,

        @NotNull(message = "paidTo is required") Long paidTo,

        @NotNull(message = "amount is required")
        @Positive(message = "amount must be greater than zero")
        BigDecimal amount,

        @Size(max = 200, message = "note must be at most 200 characters") String note) {}
