package com.ishika.settleupbackend.expense;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record PercentageInput(
        @NotNull(message = "userId is required") Long userId,
        @NotNull(message = "percent is required")
        @Positive(message = "percent must be greater than zero")
        BigDecimal percent) {}
