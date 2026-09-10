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

    private BigDecimal sum(Map<Long, BigDecimal> shares) {
        return shares.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
