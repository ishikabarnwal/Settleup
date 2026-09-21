package com.ishika.settleupbackend.settlement;

import com.ishika.settleupbackend.user.UserResponse;
import java.math.BigDecimal;

public record SuggestedPayment(UserResponse from, UserResponse to, BigDecimal amount) {}
