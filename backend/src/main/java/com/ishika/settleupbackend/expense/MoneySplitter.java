package com.ishika.settleupbackend.expense;

import com.ishika.settleupbackend.exception.BadRequestException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Splitting money is done entirely in minor units (paise) so nothing is ever
 * lost to floating point. An amount that does not divide evenly leaves a
 * remainder of a few paise; those are handed out one each to the lowest user
 * ids, which keeps the result stable for the same inputs and always sums back
 * to the original total.
 */
public final class MoneySplitter {

    public static final int SCALE = 2;

    /** 100% in hundredths of a percent. */
    private static final long FULL_BASIS_POINTS = 10_000;

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

    /**
     * Splits by percentage. Percentages are taken to two decimal places (so
     * 33.33 is fine) and have to add up to exactly 100. Each share is worked
     * out in paise and rounded down, then the paise lost to rounding are handed
     * out one each to the lowest user ids, the same way an equal split does it.
     * Nobody ends up more than a paisa away from their exact percentage.
     */
    public static Map<Long, BigDecimal> splitByPercentage(BigDecimal total, Map<Long, BigDecimal> percentByUserId) {
        if (percentByUserId == null || percentByUserId.isEmpty()) {
            throw new BadRequestException("An expense needs at least one participant");
        }

        Map<Long, Long> basisPointsByUserId = new TreeMap<>();
        long totalBasisPoints = 0;

        for (Map.Entry<Long, BigDecimal> entry : percentByUserId.entrySet()) {
            long basisPoints = toBasisPoints(entry.getValue());
            basisPointsByUserId.put(entry.getKey(), basisPoints);
            totalBasisPoints += basisPoints;
        }

        if (totalBasisPoints != FULL_BASIS_POINTS) {
            throw new BadRequestException("Percentages add up to %s but need to add up to 100"
                    .formatted(BigDecimal.valueOf(totalBasisPoints, 2).stripTrailingZeros().toPlainString()));
        }

        BigInteger totalMinor = BigInteger.valueOf(toMinorUnits(total));
        BigInteger full = BigInteger.valueOf(FULL_BASIS_POINTS);

        Map<Long, Long> minorByUserId = new LinkedHashMap<>();
        long allocated = 0;

        for (Map.Entry<Long, Long> entry : basisPointsByUserId.entrySet()) {
            long minor = totalMinor.multiply(BigInteger.valueOf(entry.getValue())).divide(full).longValueExact();
            minorByUserId.put(entry.getKey(), minor);
            allocated += minor;
        }

        // Every share was rounded down by less than a paisa, so what is left over
        // is always fewer paise than there are people.
        long leftover = totalMinor.longValueExact() - allocated;
        Map<Long, BigDecimal> shares = new LinkedHashMap<>();

        for (Map.Entry<Long, Long> entry : minorByUserId.entrySet()) {
            long minor = entry.getValue();
            if (leftover > 0) {
                minor++;
                leftover--;
            }
            shares.put(entry.getKey(), fromMinorUnits(minor));
        }

        return shares;
    }

    private static long toBasisPoints(BigDecimal percent) {
        try {
            return percent.movePointRight(2).longValueExact();
        } catch (ArithmeticException ex) {
            throw new BadRequestException("Percentages cannot be more precise than 2 decimal places");
        }
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
