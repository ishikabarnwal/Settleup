package com.ishika.settleupbackend.settlement;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

/**
 * Turns a set of net balances into a short list of payments that clears them.
 *
 * <p>Everyone with a negative balance owes money and everyone with a positive
 * balance is owed money; the two sides always cancel out. The greedy approach
 * repeatedly matches the largest debtor against the largest creditor, which
 * settles at least one person with every payment and so never needs more than
 * n-1 payments. That is not provably the theoretical minimum for every possible
 * input (finding that is NP-hard), but it is the standard approach and is
 * optimal whenever no subgroup happens to cancel out on its own.
 *
 * <p>All amounts are in minor units so the arithmetic stays exact.
 */
final class SettlementPlanner {

    private SettlementPlanner() {
    }

    record Payment(Long fromUserId, Long toUserId, long amountMinor) {}

    static List<Payment> plan(Map<Long, Long> netByUserId) {
        // Largest first on both sides, with the user id breaking ties so the
        // output is stable for the same input.
        Comparator<long[]> biggestFirst = Comparator
                .<long[]>comparingLong(entry -> entry[1])
                .reversed()
                .thenComparingLong(entry -> entry[0]);

        PriorityQueue<long[]> creditors = new PriorityQueue<>(biggestFirst);
        PriorityQueue<long[]> debtors = new PriorityQueue<>(biggestFirst);

        netByUserId.forEach((userId, net) -> {
            if (net > 0) {
                creditors.add(new long[] {userId, net});
            } else if (net < 0) {
                debtors.add(new long[] {userId, -net});
            }
        });

        List<Payment> payments = new ArrayList<>();

        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            long[] creditor = creditors.poll();
            long[] debtor = debtors.poll();

            long amount = Math.min(creditor[1], debtor[1]);
            payments.add(new Payment(debtor[0], creditor[0], amount));

            long creditorLeft = creditor[1] - amount;
            long debtorLeft = debtor[1] - amount;

            if (creditorLeft > 0) {
                creditors.add(new long[] {creditor[0], creditorLeft});
            }
            if (debtorLeft > 0) {
                debtors.add(new long[] {debtor[0], debtorLeft});
            }
        }

        return payments;
    }
}
