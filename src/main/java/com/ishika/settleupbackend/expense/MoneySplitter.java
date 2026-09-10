package com.ishika.settleupbackend.expense;

import com.ishika.settleupbackend.exception.BadRequestException;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Splitting money is done entirely in minor units (paise) so nothing is ever
 * lost to floating point. An amount that does not divide evenly leaves a
 * remainder of a few paise; those are handed out one each to the lowest user
 * ids, which keeps the result stable for the same inputs and always sums back
 * to the original total.
 */
public final class MoneySplitter {

    public static final int SCALE = 2;

    private MoneySplitter() {
    }

    public static Map<Long, BigDecimal> splitEqually(BigDecimal total, List<Long> participantIds) {
        if (participantIds == null || participantIds.isEmpty()) {
            throw new BadRequestException("An expense needs at least one participant");
        }

        long totalMinor = toMinorUnits(total);
        int people = participantIds.size();
        long base = totalMinor / people;
        long remainder = totalMinor % people;

        List<Long> ordered = participantIds.stream().sorted().toList();
        Map<Long, BigDecimal> shares = new LinkedHashMap<>();

        for (int i = 0; i < ordered.size(); i++) {
            long minor = base + (i < remainder ? 1 : 0);
            shares.put(ordered.get(i), fromMinorUnits(minor));
        }

        return shares;
    }

    public static long toMinorUnits(BigDecimal amount) {
        try {
            return amount.movePointRight(SCALE).longValueExact();
        } catch (ArithmeticException ex) {
            throw new BadRequestException("Amount cannot be more precise than " + SCALE + " decimal places");
        }
    }

    public static BigDecimal fromMinorUnits(long minor) {
        return BigDecimal.valueOf(minor, SCALE);
    }

    public static BigDecimal normalise(BigDecimal amount) {
        return fromMinorUnits(toMinorUnits(amount));
    }
}
