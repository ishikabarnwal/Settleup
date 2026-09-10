package com.ishika.settleupbackend.expense;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record ShareInput(
        @NotNull(message = "userId is required") Long userId,
        @NotNull(message = "amount is required")
        @PositiveOrZero(message = "amount cannot be negative")
        BigDecimal amount) {}
