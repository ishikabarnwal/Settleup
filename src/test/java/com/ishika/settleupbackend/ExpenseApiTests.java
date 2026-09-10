package com.ishika.settleupbackend;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

class ExpenseApiTests extends ApiTestBase {

    private String ownerToken;
    private String friendToken;
    private long groupId;
    private long ownerId;
    private long friendId;
    private long thirdId;

    @BeforeEach
    void setUp() throws Exception {
        ownerToken = api.registerAndGetToken("Ishika", "ishika@example.com");
        friendToken = api.registerAndGetToken("Riya", "riya@example.com");
        api.registerAndGetToken("Sam", "sam@example.com");

        ownerId = api.json(api.getJson("/api/users/me", ownerToken)).get("id").asLong();
        friendId = api.json(api.getJson("/api/users/me", friendToken)).get("id").asLong();

        groupId = api.idOf(api.postJson("/api/groups", ownerToken, """
                {"name":"Goa Trip"}""")
                .andExpect(status().isCreated()));

        api.postJson("/api/groups/" + groupId + "/members", ownerToken, """
                {"email":"riya@example.com"}""")
                .andExpect(status().isOk());

        JsonNode detail = api.json(api.getJson("/api/groups/" + groupId, ownerToken));
        thirdId = detail.get("members").get(1).get("id").asLong();
    }

    private String expensesPath() {
        return "/api/groups/" + groupId + "/expenses";
    }

    @Test
    void equalSplitDefaultsToEveryMember() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":1000.00,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(ownerId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.splitType").value("EQUAL"))
                .andExpect(jsonPath("$.shares.length()").value(2))
                .andExpect(jsonPath("$.shares[0].amount").value(500.00))
                .andExpect(jsonPath("$.shares[1].amount").value(500.00));
    }

    @Test
    void equalSplitSpreadsTheRoundingRemainder() throws Exception {
        JsonNode created = api.json(api.postJson(expensesPath(), ownerToken, """
                {"description":"Dinner","amount":100.00,"paidBy":%d,"splitType":"EQUAL","participantIds":[%d,%d]}"""
                .formatted(ownerId, ownerId, friendId))
                .andExpect(status().isCreated()));

        assertSharesSumTo(created, 100.00);

        JsonNode odd = api.json(api.postJson(expensesPath(), ownerToken, """
                {"description":"Auto","amount":0.05,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(ownerId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.shares[0].amount").value(0.03))
                .andExpect(jsonPath("$.shares[1].amount").value(0.02)));

        assertSharesSumTo(odd, 0.05);
    }

    @Test
    void exactSplitIsStoredAsGiven() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Groceries","amount":250.00,"paidBy":%d,"splitType":"EXACT",
                 "shares":[{"userId":%d,"amount":100.00},{"userId":%d,"amount":150.00}]}"""
                .formatted(ownerId, ownerId, friendId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.splitType").value("EXACT"))
                .andExpect(jsonPath("$.shares[0].amount").value(100.00))
                .andExpect(jsonPath("$.shares[1].amount").value(150.00));
    }

    @Test
    void exactSplitMustAddUpToTheTotal() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Groceries","amount":250.00,"paidBy":%d,"splitType":"EXACT",
                 "shares":[{"userId":%d,"amount":100.00},{"userId":%d,"amount":100.00}]}"""
                .formatted(ownerId, ownerId, friendId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Shares add up to 200.00 but the expense is 250.00"));
    }

    @Test
    void payerMustBeAGroupMember() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(thirdId + 999))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The payer must be a member of this group"));
    }

    @Test
    void participantsMustBeGroupMembers() throws Exception {
        long outsiderId = ownerId + friendId + 500;

        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"EQUAL","participantIds":[%d,%d]}"""
                .formatted(ownerId, ownerId, outsiderId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("User " + outsiderId + " is not a member of this group"));
    }

    @Test
    void rejectsDuplicateParticipants() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"EQUAL","participantIds":[%d,%d]}"""
                .formatted(ownerId, ownerId, ownerId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("User " + ownerId + " appears more than once in participantIds"));
    }

    @Test
    void rejectsWrongFieldForTheSplitType() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"EQUAL",
                 "shares":[{"userId":%d,"amount":100.00}]}"""
                .formatted(ownerId, ownerId))
                .andExpect(status().isBadRequest());

        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"EXACT","participantIds":[%d]}"""
                .formatted(ownerId, ownerId))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsBadAmounts() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":-5.00,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(ownerId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.amount").isNotEmpty());

        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":10.001,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(ownerId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Amount cannot be more precise than 2 decimal places"));

        api.postJson(expensesPath(), ownerToken, """
                {"description":"","amount":10.00,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(ownerId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.description").isNotEmpty());
    }

    @Test
    void listsExpensesForMembersOnly() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":1000.00,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(ownerId))
                .andExpect(status().isCreated());

        api.getJson(expensesPath(), friendToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].description").value("Hotel"))
                .andExpect(jsonPath("$[0].paidBy.email").value("ishika@example.com"));

        String outsider = api.registerAndGetToken("Outsider", "outsider@example.com");
        api.getJson(expensesPath(), outsider).andExpect(status().isForbidden());
    }

    @Test
    void fetchesASingleExpenseAndRejectsOneFromAnotherGroup() throws Exception {
        long expenseId = api.idOf(api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":1000.00,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(ownerId))
                .andExpect(status().isCreated()));

        api.getJson(expensesPath() + "/" + expenseId, ownerToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Hotel"));

        long otherGroupId = api.idOf(api.postJson("/api/groups", ownerToken, """
                {"name":"Other"}""")
                .andExpect(status().isCreated()));

        api.getJson("/api/groups/" + otherGroupId + "/expenses/" + expenseId, ownerToken)
                .andExpect(status().isNotFound());
    }

    private void assertSharesSumTo(JsonNode expense, double expected) {
        double sum = 0;
        for (JsonNode share : expense.get("shares")) {
            sum += share.get("amount").asDouble();
        }
        org.assertj.core.api.Assertions.assertThat(sum).isEqualTo(expected);
    }
}
