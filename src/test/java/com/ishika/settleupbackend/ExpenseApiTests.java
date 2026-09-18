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
    void percentageSplitRoundsTheSameWayAsEqual() throws Exception {
        // Half of 5 paise each is 2.5, so both round down to 2 and the spare
        // paisa goes to the lower id, just like an equal split would.
        JsonNode created = api.json(api.postJson(expensesPath(), ownerToken, """
                {"description":"Chai","amount":0.05,"paidBy":%d,"splitType":"PERCENTAGE",
                 "percentages":[{"userId":%d,"percent":50},{"userId":%d,"percent":50}]}"""
                .formatted(ownerId, friendId, ownerId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.splitType").value("PERCENTAGE"))
                .andExpect(jsonPath("$.shares[0].user.id").value(ownerId))
                .andExpect(jsonPath("$.shares[0].amount").value(0.03))
                .andExpect(jsonPath("$.shares[1].amount").value(0.02)));

        assertSharesSumTo(created, 0.05);

        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":1000.00,"paidBy":%d,"splitType":"PERCENTAGE",
                 "percentages":[{"userId":%d,"percent":70},{"userId":%d,"percent":30}]}"""
                .formatted(friendId, ownerId, friendId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.shares[0].amount").value(700.00))
                .andExpect(jsonPath("$.shares[1].amount").value(300.00));
    }

    @Test
    void percentagesMustAddUpTo100() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":1000.00,"paidBy":%d,"splitType":"PERCENTAGE",
                 "percentages":[{"userId":%d,"percent":60},{"userId":%d,"percent":30}]}"""
                .formatted(ownerId, ownerId, friendId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Percentages add up to 90 but need to add up to 100"))
                .andExpect(jsonPath("$.path").value(expensesPath()))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    void rejectsBadPercentageInput() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"PERCENTAGE",
                 "percentages":[{"userId":%d,"percent":-10},{"userId":%d,"percent":110}]}"""
                .formatted(ownerId, ownerId, friendId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors['percentages[0].percent']").value("percent must be greater than zero"));

        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"PERCENTAGE"}"""
                .formatted(ownerId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("A PERCENTAGE split needs at least one percentage"));

        long outsiderId = ownerId + friendId + 500;
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"PERCENTAGE",
                 "percentages":[{"userId":%d,"percent":50},{"userId":%d,"percent":50}]}"""
                .formatted(ownerId, ownerId, outsiderId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("User " + outsiderId + " is not a member of this group"));

        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"PERCENTAGE",
                 "percentages":[{"userId":%d,"percent":50},{"userId":%d,"percent":50}]}"""
                .formatted(ownerId, ownerId, ownerId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("User " + ownerId + " appears more than once in percentages"));
    }

    @Test
    void percentagesOnlyApplyToPercentageSplits() throws Exception {
        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"EQUAL",
                 "percentages":[{"userId":%d,"percent":100}]}"""
                .formatted(ownerId, ownerId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "percentages only applies to PERCENTAGE splits, use participantIds for EQUAL"));

        api.postJson(expensesPath(), ownerToken, """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"PERCENTAGE",
                 "shares":[{"userId":%d,"amount":100.00}]}"""
                .formatted(ownerId, ownerId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "shares only applies to EXACT splits, use percentages for PERCENTAGE"));
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
