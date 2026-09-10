package com.ishika.settleupbackend.settlement;

import static org.assertj.core.api.Assertions.assertThat;

import com.ishika.settleupbackend.settlement.SettlementPlanner.Payment;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SettlementPlannerTests {

    @Test
    void planIsEmptyWhenNobodyOwesAnything() {
        assertThat(SettlementPlanner.plan(nets(1L, 0L, 2L, 0L))).isEmpty();
    }

    @Test
    void oneDebtorPaysOneCreditor() {
        List<Payment> plan = SettlementPlanner.plan(nets(1L, 5000L, 2L, -5000L));

        assertThat(plan).containsExactly(new Payment(2L, 1L, 5000L));
    }

    @Test
    void threeWaySplitCollapsesToTwoPayments() {
        // Ishika fronted 300, everyone owes 100 each.
        List<Payment> plan = SettlementPlanner.plan(nets(1L, 20000L, 2L, -10000L, 3L, -10000L));

        assertThat(plan).hasSize(2);
        assertThat(plan).allSatisfy(payment -> assertThat(payment.toUserId()).isEqualTo(1L));
        assertThat(totalMoved(plan)).isEqualTo(20000L);
    }

    @Test
    void neverNeedsMoreThanOnePaymentPerPersonMinusOne() {
        Map<Long, Long> nets = nets(1L, 10000L, 2L, 5000L, 3L, -3000L, 4L, -12000L);

        List<Payment> plan = SettlementPlanner.plan(nets);

        assertThat(plan.size()).isLessThanOrEqualTo(nets.size() - 1);
        assertThat(applyTo(nets, plan)).allSatisfy((userId, net) -> assertThat(net).isZero());
    }

    @Test
    void everyPlanClearsAllBalances() {
        List<Map<Long, Long>> scenarios = List.of(
                nets(1L, 3333L, 2L, 3333L, 3L, -6666L),
                nets(1L, 1L, 2L, -1L),
                nets(1L, 100000L, 2L, -25000L, 3L, -25000L, 4L, -25000L, 5L, -25000L),
                nets(1L, 700L, 2L, -300L, 3L, -400L),
                nets(1L, 0L, 2L, 4500L, 3L, -4500L));

        for (Map<Long, Long> nets : scenarios) {
            List<Payment> plan = SettlementPlanner.plan(nets);

            assertThat(applyTo(nets, plan))
                    .as("plan for %s should clear every balance", nets)
                    .allSatisfy((userId, net) -> assertThat(net).isZero());
            assertThat(plan).allSatisfy(payment -> assertThat(payment.amountMinor()).isPositive());
        }
    }

    @Test
    void nobodyIsAskedToPayThemselves() {
        List<Payment> plan = SettlementPlanner.plan(nets(1L, 5000L, 2L, -2000L, 3L, -3000L));

        assertThat(plan).allSatisfy(payment -> assertThat(payment.fromUserId()).isNotEqualTo(payment.toUserId()));
    }

    @Test
    void sameInputGivesTheSamePlan() {
        Map<Long, Long> nets = nets(3L, -4000L, 1L, 9000L, 2L, -5000L);

        assertThat(SettlementPlanner.plan(nets)).isEqualTo(SettlementPlanner.plan(nets));
    }

    private Map<Long, Long> nets(Object... pairs) {
        Map<Long, Long> nets = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            nets.put((Long) pairs[i], (Long) pairs[i + 1]);
        }
        return nets;
    }

    private long totalMoved(List<Payment> plan) {
        return plan.stream().mapToLong(Payment::amountMinor).sum();
    }

    /** Applies the plan to the starting balances; everything should land on zero. */
    private Map<Long, Long> applyTo(Map<Long, Long> nets, List<Payment> plan) {
        Map<Long, Long> result = new LinkedHashMap<>(nets);
        for (Payment payment : plan) {
            result.merge(payment.fromUserId(), payment.amountMinor(), Long::sum);
            result.merge(payment.toUserId(), -payment.amountMinor(), Long::sum);
        }
        return result;
    }
}
