package com.ishika.settleupbackend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

/** Deleting expenses and settlements, and taking people out of a group. */
class RemovalApiTests extends ApiTestBase {

    private String ishikaToken;
    private String riyaToken;
    private String taraToken;
    private long groupId;
    private long ishika;
    private long riya;
    private long tara;

    @BeforeEach
    void setUpGroup() throws Exception {
        ishikaToken = api.registerAndGetToken("Ishika", "ishika@example.com");
        riyaToken = api.registerAndGetToken("Riya", "riya@example.com");
        taraToken = api.registerAndGetToken("Tara", "tara@example.com");

        groupId = api.idOf(api.postJson("/api/groups", ishikaToken, """
                {"name":"Goa Trip"}""")
                .andExpect(status().isCreated()));

        for (String email : new String[] {"riya@example.com", "tara@example.com"}) {
            api.postJson(path("/members"), ishikaToken, """
                    {"email":"%s"}""".formatted(email))
                    .andExpect(status().isOk());
        }

        JsonNode members = api.json(api.getJson(path(""), ishikaToken)).get("members");
        ishika = members.get(0).get("id").asLong();
        riya = members.get(1).get("id").asLong();
        tara = members.get(2).get("id").asLong();
    }

    private String path(String suffix) {
        return "/api/groups/" + groupId + suffix;
    }

    private long addEqualExpense(String amount, long payer) throws Exception {
        return api.idOf(api.postJson(path("/expenses"), ishikaToken, """
                {"description":"Hotel","amount":%s,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(amount, payer))
                .andExpect(status().isCreated()));
    }

    private long settle(long from, long to, String amount) throws Exception {
        return api.idOf(api.postJson(path("/settlements"), ishikaToken, """
                {"paidBy":%d,"paidTo":%d,"amount":%s}"""
                .formatted(from, to, amount))
                .andExpect(status().isCreated()));
    }

    private void assertNetsSumToZero() throws Exception {
        long totalPaise = 0;
        for (JsonNode balance : api.json(api.getJson(path("/balances"), ishikaToken))) {
            totalPaise += Math.round(balance.get("net").asDouble() * 100);
        }
        assertThat(totalPaise).isZero();
    }

    @Test
    void deletingAnExpenseTakesItOutOfTheBalances() throws Exception {
        long hotel = addEqualExpense("3000.00", ishika);
        addEqualExpense("300.00", riya);

        api.delete(path("/expenses/" + hotel), riyaToken).andExpect(status().isNoContent());

        api.getJson(path("/expenses/" + hotel), ishikaToken).andExpect(status().isNotFound());
        api.getJson(path("/expenses"), ishikaToken).andExpect(jsonPath("$.length()").value(1));

        api.getJson(path("/balances"), ishikaToken)
                .andExpect(jsonPath("$[0].net").value(-100.00))
                .andExpect(jsonPath("$[1].net").value(200.00))
                .andExpect(jsonPath("$[2].net").value(-100.00));
        assertNetsSumToZero();
    }

    @Test
    void deletingAnExpenseAfterSettlingUpLeavesTheRepaymentOwedBack() throws Exception {
        long hotel = addEqualExpense("3000.00", ishika);
        settle(riya, ishika, "1000.00");

        api.delete(path("/expenses/" + hotel), ishikaToken).andExpect(status().isNoContent());

        // Riya paid Ishika 1000 for a hotel that is no longer on the books, so
        // Ishika now owes it back.
        api.getJson(path("/balances"), ishikaToken)
                .andExpect(jsonPath("$[0].net").value(-1000.00))
                .andExpect(jsonPath("$[1].net").value(1000.00))
                .andExpect(jsonPath("$[2].net").value(0));

        api.getJson(path("/settlements/suggested"), ishikaToken)
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].from.id").value(ishika))
                .andExpect(jsonPath("$[0].to.id").value(riya))
                .andExpect(jsonPath("$[0].amount").value(1000.00));
        assertNetsSumToZero();
    }

    @Test
    void expenseDeletionIsScopedToTheGroupAndItsMembers() throws Exception {
        long hotel = addEqualExpense("3000.00", ishika);

        long otherGroup = api.idOf(api.postJson("/api/groups", ishikaToken, """
                {"name":"Other"}""")
                .andExpect(status().isCreated()));

        api.delete("/api/groups/" + otherGroup + "/expenses/" + hotel, ishikaToken)
                .andExpect(status().isNotFound());
        api.delete(path("/expenses/999999"), ishikaToken).andExpect(status().isNotFound());

        String outsider = api.registerAndGetToken("Sam", "sam@example.com");
        api.delete(path("/expenses/" + hotel), outsider).andExpect(status().isForbidden());

        api.getJson(path("/expenses/" + hotel), ishikaToken).andExpect(status().isOk());
    }

    @Test
    void deletingASettlementPutsTheDebtBack() throws Exception {
        addEqualExpense("3000.00", ishika);
        long payment = settle(riya, ishika, "1000.00");

        api.getJson(path("/balances"), ishikaToken).andExpect(jsonPath("$[1].net").value(0));

        api.delete(path("/settlements/" + payment), riyaToken).andExpect(status().isNoContent());

        api.getJson(path("/settlements"), ishikaToken).andExpect(jsonPath("$.length()").value(0));
        api.getJson(path("/balances"), ishikaToken)
                .andExpect(jsonPath("$[0].net").value(2000.00))
                .andExpect(jsonPath("$[1].net").value(-1000.00))
                .andExpect(jsonPath("$[1].settlementsPaid").value(0));
        assertNetsSumToZero();

        api.delete(path("/settlements/" + payment), riyaToken)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Settlement " + payment + " not found in group " + groupId));
    }

    @Test
    void removesAMemberWhoIsSquare() throws Exception {
        api.delete(path("/members/" + tara), ishikaToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members.length()").value(2));

        api.getJson(path(""), taraToken).andExpect(status().isForbidden());
        api.getJson("/api/groups", taraToken).andExpect(jsonPath("$.length()").value(0));

        api.delete(path("/members/" + tara), ishikaToken)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User " + tara + " is not a member of this group"));
    }

    @Test
    void refusesToRemoveSomeoneWhoStillOwesOrIsOwed() throws Exception {
        addEqualExpense("3000.00", ishika);

        api.delete(path("/members/" + riya), ishikaToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(
                        "Riya can't be removed while their balance in this group is -1000.00. Settle up first."));

        api.delete(path("/members/" + tara), ishikaToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Tara can't be removed while their balance in this group is -1000.00. Settle up first."));

        api.getJson(path(""), ishikaToken).andExpect(jsonPath("$.members.length()").value(3));

        settle(riya, ishika, "1000.00");
        api.delete(path("/members/" + riya), ishikaToken).andExpect(status().isOk());
    }

    @Test
    void formerMembersStayInTheHistoryWithoutBreakingBalances() throws Exception {
        long hotel = addEqualExpense("3000.00", ishika);
        long payment = settle(riya, ishika, "1000.00");

        api.delete(path("/members/" + riya), ishikaToken).andExpect(status().isOk());

        api.getJson(path("/balances"), ishikaToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].net").value(1000.00))
                .andExpect(jsonPath("$[1].net").value(-1000.00));
        assertNetsSumToZero();

        api.getJson(path("/settlements/suggested"), ishikaToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].from.id").value(tara));

        api.getJson(path("/expenses/" + hotel), ishikaToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shares[1].user.name").value("Riya"));
        api.getJson(path("/settlements"), ishikaToken)
                .andExpect(jsonPath("$[0].paidBy.name").value("Riya"));

        // Undoing either would hand Riya a balance in a group they have left.
        api.delete(path("/expenses/" + hotel), ishikaToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "This expense can't be deleted because Riya is no longer in the group"));
        api.delete(path("/settlements/" + payment), ishikaToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "This settlement can't be deleted because Riya is no longer in the group"));
    }
}
