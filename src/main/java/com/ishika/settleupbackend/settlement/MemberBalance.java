package com.ishika.settleupbackend.settlement;

import com.ishika.settleupbackend.user.UserResponse;
import java.math.BigDecimal;

/**
 * One member's standing in a group. A positive net means the group owes them
 * that much; a negative net means they owe the group.
 */
public record MemberBalance(
        UserResponse user,
        BigDecimal totalPaid,
        BigDecimal totalShare,
        BigDecimal settlementsPaid,
        BigDecimal settlementsReceived,
        BigDecimal net) {}
