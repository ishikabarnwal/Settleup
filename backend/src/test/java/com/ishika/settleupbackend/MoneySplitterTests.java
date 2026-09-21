package com.ishika.settleupbackend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ishika.settleupbackend.exception.BadRequestException;
import com.ishika.settleupbackend.expense.MoneySplitter;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MoneySplitterTests {

    @Test
    void splitsEvenlyWhenItDividesCleanly() {
        Map<Long, BigDecimal> shares = MoneySplitter.splitEqually(new BigDecimal("900.00"), List.of(1L, 2L, 3L));

        assertThat(shares).containsExactly(
                Map.entry(1L, new BigDecimal("300.00")),
                Map.entry(2L, new BigDecimal("300.00")),
                Map.entry(3L, new BigDecimal("300.00")));
    }

    @Test
    void handsLeftoverPaiseToTheLowestIdsAndStillSumsToTheTotal() {
        BigDecimal total = new BigDecimal("100.00");
        Map<Long, BigDecimal> shares = MoneySplitter.splitEqually(total, List.of(1L, 2L, 3L));

        assertThat(shares.values()).containsExactly(
                new BigDecimal("33.34"), new BigDecimal("33.33"), new BigDecimal("33.33"));
        assertThat(sum(shares)).isEqualByComparingTo(total);
    }

    @Test
    void orderOfParticipantsDoesNotChangeTheResult() {
        BigDecimal total = new BigDecimal("10.00");

        Map<Long, BigDecimal> ascending = MoneySplitter.splitEqually(total, List.of(4L, 7L, 9L));
        Map<Long, BigDecimal> shuffled = MoneySplitter.splitEqually(total, List.of(9L, 4L, 7L));

        assertThat(ascending).isEqualTo(shuffled);
        assertThat(ascending.get(4L)).isEqualByComparingTo("3.34");
        assertThat(ascending.get(7L)).isEqualByComparingTo("3.33");
        assertThat(ascending.get(9L)).isEqualByComparingTo("3.33");
    }

    @Test
    void everyRemainderFromOneToSixPaiseStillBalances() {
        for (int paise = 1; paise <= 6; paise++) {
            BigDecimal total = new BigDecimal("10.0" + paise);
            Map<Long, BigDecimal> shares = MoneySplitter.splitEqually(total, List.of(1L, 2L, 3L, 4L, 5L, 6L, 7L));

            assertThat(sum(shares))
                    .as("total %s should be fully distributed", total)
                    .isEqualByComparingTo(total);
        }
    }

    @Test
    void nobodyIsMoreThanOnePaiseWorseOff() {
        Map<Long, BigDecimal> shares = MoneySplitter.splitEqually(new BigDecimal("100.00"), List.of(1L, 2L, 3L));

        BigDecimal biggest = shares.values().stream().max(BigDecimal::compareTo).orElseThrow();
        BigDecimal smallest = shares.values().stream().min(BigDecimal::compareTo).orElseThrow();

        assertThat(biggest.subtract(smallest)).isEqualByComparingTo("0.01");
    }

    @Test
    void singleParticipantTakesTheWholeAmount() {
        Map<Long, BigDecimal> shares = MoneySplitter.splitEqually(new BigDecimal("45.67"), List.of(8L));

        assertThat(shares.get(8L)).isEqualByComparingTo("45.67");
    }

    @Test
    void rejectsAnEmptyParticipantList() {
        assertThatThrownBy(() -> MoneySplitter.splitEqually(new BigDecimal("10.00"), List.of()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("at least one participant");
    }

    @Test
    void rejectsAmountsFinerThanTwoDecimalPlaces() {
        assertThatThrownBy(() -> MoneySplitter.toMinorUnits(new BigDecimal("10.001")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("2 decimal places");
    }

    @Test
    void splitsByPercentageWhenItDividesCleanly() {
        Map<Long, BigDecimal> shares = MoneySplitter.splitByPercentage(
                new BigDecimal("1000.00"),
                Map.of(1L, new BigDecimal("50"), 2L, new BigDecimal("30"), 3L, new BigDecimal("20")));

        assertThat(shares).containsExactly(
                Map.entry(1L, new BigDecimal("500.00")),
                Map.entry(2L, new BigDecimal("300.00")),
                Map.entry(3L, new BigDecimal("200.00")));
    }

    @Test
    void percentageRoundingHandsLeftoverPaiseToTheLowestIds() {
        // 33.33% of 10.00 is 3.333, so everyone rounds down to 3.33 and the one
        // paisa left over goes to user 1.
        BigDecimal total = new BigDecimal("10.00");
        Map<Long, BigDecimal> shares = MoneySplitter.splitByPercentage(total, Map.of(
                3L, new BigDecimal("33.34"), 1L, new BigDecimal("33.33"), 2L, new BigDecimal("33.33")));

        assertThat(shares).containsExactly(
                Map.entry(1L, new BigDecimal("3.34")),
                Map.entry(2L, new BigDecimal("3.33")),
                Map.entry(3L, new BigDecimal("3.33")));
        assertThat(sum(shares)).isEqualByComparingTo(total);
    }

    @Test
    void percentageSharesAlwaysAddBackUpAndStayWithinAPaisaOfExact() {
        List<Map<Long, BigDecimal>> splits = List.of(
                Map.of(1L, new BigDecimal("33.33"), 2L, new BigDecimal("33.33"), 3L, new BigDecimal("33.34")),
                Map.of(1L, new BigDecimal("12.5"), 2L, new BigDecimal("12.5"), 3L, new BigDecimal("75")),
                Map.of(1L, new BigDecimal("0.01"), 2L, new BigDecimal("99.99")),
                Map.of(1L, new BigDecimal("14.29"), 2L, new BigDecimal("14.29"), 3L, new BigDecimal("14.29"),
                        4L, new BigDecimal("14.29"), 5L, new BigDecimal("14.28"), 6L, new BigDecimal("14.28"),
                        7L, new BigDecimal("14.28")));

        for (String amount : List.of("0.01", "0.07", "1.00", "10.01", "99.99", "1234.56")) {
            BigDecimal total = new BigDecimal(amount);

            for (Map<Long, BigDecimal> percentages : splits) {
                Map<Long, BigDecimal> shares = MoneySplitter.splitByPercentage(total, percentages);

                assertThat(sum(shares)).as("%s split %s", total, percentages).isEqualByComparingTo(total);

                percentages.forEach((userId, percent) -> {
                    BigDecimal exact = total.multiply(percent).divide(new BigDecimal("100"));
                    assertThat(shares.get(userId).subtract(exact).abs())
                            .as("user %d on %s", userId, total)
                            .isLessThan(new BigDecimal("0.01"));
                });
            }
        }
    }

    @Test
    void handlesVeryLargeAmountsWithoutOverflowing() {
        // In paise times basis points this is far past what a long can hold.
        BigDecimal total = new BigDecimal("999999999999999.99");
        Map<Long, BigDecimal> shares = MoneySplitter.splitByPercentage(
                total, Map.of(1L, new BigDecimal("33.33"), 2L, new BigDecimal("66.67")));

        assertThat(sum(shares)).isEqualByComparingTo(total);
    }

    @Test
    void rejectsPercentagesThatDoNotAddUpTo100() {
        assertThatThrownBy(() -> MoneySplitter.splitByPercentage(
                        new BigDecimal("10.00"), Map.of(1L, new BigDecimal("50"), 2L, new BigDecimal("40.5"))))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Percentages add up to 90.5 but need to add up to 100");
    }

    @Test
    void rejectsPercentagesFinerThanTwoDecimalPlaces() {
        assertThatThrownBy(() -> MoneySplitter.splitByPercentage(
                        new BigDecimal("10.00"), Map.of(1L, new BigDecimal("33.333"), 2L, new BigDecimal("66.667"))))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Percentages cannot be more precise than 2 decimal places");
    }

    private BigDecimal sum(Map<Long, BigDecimal> shares) {
        return shares.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
