package com.ishika.settleupbackend.settlement;

import com.ishika.settleupbackend.user.UserResponse;
import java.math.BigDecimal;
import java.time.Instant;

public record SettlementResponse(
        Long id,
        Long groupId,
        UserResponse paidBy,
        UserResponse paidTo,
        BigDecimal amount,
        String note,
        Instant settledAt) {

    public static SettlementResponse from(Settlement settlement) {
        return new SettlementResponse(
                settlement.getId(),
                settlement.getGroup().getId(),
                UserResponse.from(settlement.getPaidBy()),
                UserResponse.from(settlement.getPaidTo()),
                settlement.getAmount(),
                settlement.getNote(),
                settlement.getSettledAt());
    }
}
