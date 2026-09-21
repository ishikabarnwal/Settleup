package com.ishika.settleupbackend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class SettlementApiTests extends ApiTestBase {

    private String ishikaToken;
    private String riyaToken;
    private long groupId;
    private long ishika;
    private long riya;
    private long tara;

    @BeforeEach
    void setUpGroup() throws Exception {
        ishikaToken = api.registerAndGetToken("Ishika", "ishika@example.com");
        riyaToken = api.registerAndGetToken("Riya", "riya@example.com");
        api.registerAndGetToken("Tara", "tara@example.com");

        groupId = api.idOf(api.postJson("/api/groups", ishikaToken, """
                {"name":"Goa Trip"}""")
                .andExpect(status().isCreated()));

        api.postJson("/api/groups/" + groupId + "/members", ishikaToken, """
                {"email":"riya@example.com"}""")
                .andExpect(status().isOk());
        api.postJson("/api/groups/" + groupId + "/members", ishikaToken, """
                {"email":"tara@example.com"}""")
                .andExpect(status().isOk());

        JsonNode members = api.json(api.getJson("/api/groups/" + groupId, ishikaToken)).get("members");
        ishika = members.get(0).get("id").asLong();
        riya = members.get(1).get("id").asLong();
        tara = members.get(2).get("id").asLong();
    }

    private String path(String suffix) {
        return "/api/groups/" + groupId + suffix;
    }

    private void addEqualExpense(String description, String amount, long payer) throws Exception {
        api.postJson(path("/expenses"), ishikaToken, """
                {"description":"%s","amount":%s,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(description, amount, payer))
                .andExpect(status().isCreated());
    }

    @Test
    void balancesStartAtZero() throws Exception {
        api.getJson(path("/balances"), ishikaToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].net").value(0));
    }

    @Test
    void payerIsOwedTheRestOfTheGroupsShare() throws Exception {
        addEqualExpense("Hotel", "3000.00", ishika);

        api.getJson(path("/balances"), riyaToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].totalPaid").value(3000.00))
                .andExpect(jsonPath("$[0].totalShare").value(1000.00))
                .andExpect(jsonPath("$[0].net").value(2000.00))
                .andExpect(jsonPath("$[1].net").value(-1000.00))
                .andExpect(jsonPath("$[2].net").value(-1000.00));
    }

    @Test
    void balancesAcrossAGroupAlwaysAddUpToZero() throws Exception {
        addEqualExpense("Hotel", "3000.00", ishika);
        addEqualExpense("Dinner", "100.00", riya);
        addEqualExpense("Cab", "0.05", tara);

        api.postJson(path("/settlements"), riyaToken, """
                {"paidBy":%d,"paidTo":%d,"amount":250.00}"""
                .formatted(riya, ishika))
                .andExpect(status().isCreated());

        assertNetsSumToZero(api.json(api.getJson(path("/balances"), ishikaToken)));
    }

    @Test
    void settlementMovesTheBalanceAndShowsInHistory() throws Exception {
        addEqualExpense("Hotel", "3000.00", ishika);

        api.postJson(path("/settlements"), riyaToken, """
                {"paidBy":%d,"paidTo":%d,"amount":1000.00,"note":"upi"}"""
                .formatted(riya, ishika))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(1000.00))
                .andExpect(jsonPath("$.note").value("upi"))
                .andExpect(jsonPath("$.paidBy.name").value("Riya"))
                .andExpect(jsonPath("$.paidTo.name").value("Ishika"));

        api.getJson(path("/balances"), ishikaToken)
                .andExpect(jsonPath("$[0].net").value(1000.00))
                .andExpect(jsonPath("$[1].net").value(0))
                .andExpect(jsonPath("$[2].net").value(-1000.00));

        api.getJson(path("/settlements"), ishikaToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].note").value("upi"));
    }

    @Test
    void partialPaymentLeavesTheRemainderOutstanding() throws Exception {
        addEqualExpense("Hotel", "3000.00", ishika);

        api.postJson(path("/settlements"), riyaToken, """
                {"paidBy":%d,"paidTo":%d,"amount":400.00}"""
                .formatted(riya, ishika))
                .andExpect(status().isCreated());

        api.getJson(path("/balances"), riyaToken)
                .andExpect(jsonPath("$[1].net").value(-600.00))
                .andExpect(jsonPath("$[1].settlementsPaid").value(400.00));
    }

    @Test
    void suggestedPaymentsClearTheGroup() throws Exception {
        addEqualExpense("Hotel", "3000.00", ishika);
        addEqualExpense("Dinner", "600.00", riya);

        JsonNode suggestions = api.json(api.getJson(path("/settlements/suggested"), ishikaToken)
                .andExpect(status().isOk()));

        assertThat(suggestions.size()).isLessThanOrEqualTo(2);

        // Recording every suggestion should leave the whole group on zero.
        for (JsonNode payment : suggestions) {
            api.postJson(path("/settlements"), ishikaToken, """
                    {"paidBy":%d,"paidTo":%d,"amount":%s}"""
                    .formatted(
                            payment.get("from").get("id").asLong(),
                            payment.get("to").get("id").asLong(),
                            payment.get("amount").asString()))
                    .andExpect(status().isCreated());
        }

        JsonNode balances = api.json(api.getJson(path("/balances"), ishikaToken));
        for (JsonNode balance : balances) {
            assertThat(balance.get("net").asDouble()).isZero();
        }
    }

    @Test
    void suggestedIsEmptyWhenNothingIsOwed() throws Exception {
        api.getJson(path("/settlements/suggested"), ishikaToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void rejectsSelfSettlementAndNonMembers() throws Exception {
        api.postJson(path("/settlements"), ishikaToken, """
                {"paidBy":%d,"paidTo":%d,"amount":100.00}"""
                .formatted(ishika, ishika))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A settlement needs two different people"));

        api.postJson(path("/settlements"), ishikaToken, """
                {"paidBy":%d,"paidTo":%d,"amount":100.00}"""
                .formatted(ishika, ishika + riya + tara + 500))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("paidTo must be a member of this group"));
    }

    @Test
    void rejectsBadSettlementAmounts() throws Exception {
        api.postJson(path("/settlements"), ishikaToken, """
                {"paidBy":%d,"paidTo":%d,"amount":-10.00}"""
                .formatted(riya, ishika))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.amount").isNotEmpty());

        api.postJson(path("/settlements"), ishikaToken, """
                {"paidBy":%d,"paidTo":%d,"amount":10.001}"""
                .formatted(riya, ishika))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Amount cannot be more precise than 2 decimal places"));
    }

    @Test
    void outsidersCannotSeeBalancesOrSettle() throws Exception {
        String outsider = api.registerAndGetToken("Sam", "sam@example.com");

        api.getJson(path("/balances"), outsider).andExpect(status().isForbidden());
        api.getJson(path("/settlements"), outsider).andExpect(status().isForbidden());
        api.getJson(path("/settlements/suggested"), outsider).andExpect(status().isForbidden());

        api.postJson(path("/settlements"), outsider, """
                {"paidBy":%d,"paidTo":%d,"amount":100.00}"""
                .formatted(riya, ishika))
                .andExpect(status().isForbidden());
    }

    @Test
    void roundingRemaindersStillBalanceAfterSettling() throws Exception {
        addEqualExpense("Chai", "0.05", ishika);
        addEqualExpense("Samosa", "10.00", riya);
        addEqualExpense("Auto", "33.33", tara);

        JsonNode suggestions = api.json(api.getJson(path("/settlements/suggested"), ishikaToken));

        for (JsonNode payment : suggestions) {
            api.postJson(path("/settlements"), ishikaToken, """
                    {"paidBy":%d,"paidTo":%d,"amount":%s}"""
                    .formatted(
                            payment.get("from").get("id").asLong(),
                            payment.get("to").get("id").asLong(),
                            payment.get("amount").asString()))
                    .andExpect(status().isCreated());
        }

        JsonNode balances = api.json(api.getJson(path("/balances"), ishikaToken));
        for (JsonNode balance : balances) {
            assertThat(balance.get("net").asDouble())
                    .as("%s should be square", balance.get("user").get("name").asString())
                    .isZero();
        }
    }

    private void assertNetsSumToZero(JsonNode balances) {
        List<Double> nets = new ArrayList<>();
        balances.forEach(balance -> nets.add(balance.get("net").asDouble()));

        assertThat(nets.stream().mapToDouble(Double::doubleValue).sum()).isZero();
    }
}
