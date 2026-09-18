package com.ishika.settleupbackend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.JsonNode;

class IdempotencyApiTests extends ApiTestBase {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String ishikaToken;
    private String riyaToken;
    private long groupId;
    private long ishika;
    private long riya;

    @BeforeEach
    void setUpGroup() throws Exception {
        ishikaToken = api.registerAndGetToken("Ishika", "ishika@example.com");
        riyaToken = api.registerAndGetToken("Riya", "riya@example.com");

        groupId = api.idOf(api.postJson("/api/groups", ishikaToken, """
                {"name":"Goa Trip"}""")
                .andExpect(status().isCreated()));

        api.postJson(path("/members"), ishikaToken, """
                {"email":"riya@example.com"}""")
                .andExpect(status().isOk());

        JsonNode members = api.json(api.getJson(path(""), ishikaToken)).get("members");
        ishika = members.get(0).get("id").asLong();
        riya = members.get(1).get("id").asLong();
    }

    private String path(String suffix) {
        return "/api/groups/" + groupId + suffix;
    }

    private String hotel(String amount) {
        return """
                {"description":"Hotel","amount":%s,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(amount, ishika);
    }

    private int expenseCount() throws Exception {
        return api.json(api.getJson(path("/expenses"), ishikaToken)).size();
    }

    @Test
    void retryingWithTheSameKeyReturnsTheOriginalExpense() throws Exception {
        JsonNode first = api.json(api.postJson(path("/expenses"), ishikaToken, "hotel-1", hotel("3000.00"))
                .andExpect(status().isCreated())
                .andExpect(header().doesNotExist("Idempotent-Replayed")));

        // Same values, different formatting and field order.
        JsonNode retry = api.json(api.postJson(path("/expenses"), ishikaToken, "hotel-1", """
                {  "splitType":"EQUAL", "paidBy":%d, "amount":3000.00,
                   "description":"Hotel" }""".formatted(ishika))
                .andExpect(status().isCreated())
                .andExpect(header().string("Idempotent-Replayed", "true")));

        assertThat(retry).isEqualTo(first);
        assertThat(expenseCount()).isEqualTo(1);

        api.getJson(path("/balances"), ishikaToken).andExpect(jsonPath("$[0].net").value(1500.00));
    }

    @Test
    void retryingASettlementDoesNotPayTwice() throws Exception {
        api.postJson(path("/expenses"), ishikaToken, hotel("3000.00")).andExpect(status().isCreated());

        String payment = """
                {"paidBy":%d,"paidTo":%d,"amount":500.00,"note":"upi"}""".formatted(riya, ishika);

        long firstId = api.idOf(api.postJson(path("/settlements"), riyaToken, "pay-1", payment)
                .andExpect(status().isCreated()));
        api.postJson(path("/settlements"), riyaToken, "pay-1", payment)
                .andExpect(status().isCreated())
                .andExpect(header().string("Idempotent-Replayed", "true"))
                .andExpect(jsonPath("$.id").value(firstId));

        api.getJson(path("/settlements"), ishikaToken).andExpect(jsonPath("$.length()").value(1));
        api.getJson(path("/balances"), ishikaToken).andExpect(jsonPath("$[1].net").value(-1000.00));
    }

    @Test
    void reusingAKeyForADifferentRequestIsAConflict() throws Exception {
        api.postJson(path("/expenses"), ishikaToken, "key-1", hotel("3000.00")).andExpect(status().isCreated());

        api.postJson(path("/expenses"), ishikaToken, "key-1", hotel("3000.01"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value(
                        "This Idempotency-Key has already been used for a different request. "
                                + "Use a new key for a new request."));

        // Same key on a different endpoint counts as a different request too.
        api.postJson(path("/settlements"), ishikaToken, "key-1", """
                {"paidBy":%d,"paidTo":%d,"amount":10.00}""".formatted(riya, ishika))
                .andExpect(status().isConflict());

        assertThat(expenseCount()).isEqualTo(1);
        api.getJson(path("/settlements"), ishikaToken).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void keysBelongToTheUserWhoSentThem() throws Exception {
        api.postJson(path("/expenses"), ishikaToken, "shared", hotel("3000.00")).andExpect(status().isCreated());

        api.postJson(path("/expenses"), riyaToken, "shared", hotel("3000.00"))
                .andExpect(status().isCreated())
                .andExpect(header().doesNotExist("Idempotent-Replayed"));

        assertThat(expenseCount()).isEqualTo(2);
    }

    @Test
    void withoutAKeyEveryPostCreatesSomething() throws Exception {
        api.postJson(path("/expenses"), ishikaToken, hotel("3000.00")).andExpect(status().isCreated());
        api.postJson(path("/expenses"), ishikaToken, hotel("3000.00")).andExpect(status().isCreated());

        assertThat(expenseCount()).isEqualTo(2);
    }

    @Test
    void aFailedRequestDoesNotUseUpTheKey() throws Exception {
        api.postJson(path("/expenses"), ishikaToken, "retry-me", """
                {"description":"Hotel","amount":100.00,"paidBy":%d,"splitType":"PERCENTAGE",
                 "percentages":[{"userId":%d,"percent":60},{"userId":%d,"percent":30}]}"""
                .formatted(ishika, ishika, riya))
                .andExpect(status().isBadRequest());

        api.postJson(path("/expenses"), ishikaToken, "retry-me", hotel("100.00"))
                .andExpect(status().isCreated())
                .andExpect(header().doesNotExist("Idempotent-Replayed"));

        assertThat(expenseCount()).isEqualTo(1);
    }

    @Test
    void anExpiredKeyCanBeUsedAgain() throws Exception {
        api.postJson(path("/expenses"), ishikaToken, "old-key", hotel("3000.00")).andExpect(status().isCreated());

        jdbcTemplate.update("update idempotency_keys set created_at = created_at - interval '25' hour");

        api.postJson(path("/expenses"), ishikaToken, "old-key", hotel("10.00"))
                .andExpect(status().isCreated())
                .andExpect(header().doesNotExist("Idempotent-Replayed"));

        assertThat(expenseCount()).isEqualTo(2);
    }

    @Test
    void rejectsKeysThatAreBlankOrTooLong() throws Exception {
        api.postJson(path("/expenses"), ishikaToken, " ", hotel("10.00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Idempotency-Key must be between 1 and 255 characters"));

        api.postJson(path("/expenses"), ishikaToken, "k".repeat(256), hotel("10.00"))
                .andExpect(status().isBadRequest());

        assertThat(expenseCount()).isZero();
    }

    @Test
    void simultaneousRetriesStillCreateOnlyOneExpense() throws Exception {
        int attempts = 8;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);

        try {
            List<Callable<MockHttpServletResponse>> calls = new ArrayList<>();
            for (int i = 0; i < attempts; i++) {
                calls.add(() -> api.postJson(path("/expenses"), ishikaToken, "burst", hotel("3000.00"))
                        .andReturn()
                        .getResponse());
            }

            List<Long> createdIds = new ArrayList<>();
            for (Future<MockHttpServletResponse> future : pool.invokeAll(calls)) {
                MockHttpServletResponse response = future.get();

                // Every caller either gets the one expense back, or is told the
                // original is still in flight and to try again.
                assertThat(response.getStatus()).isIn(201, 409);
                if (response.getStatus() == 201) {
                    createdIds.add(objectMapper.readTree(response.getContentAsString()).get("id").asLong());
                }
            }

            assertThat(createdIds).isNotEmpty();
            assertThat(createdIds).containsOnly(createdIds.get(0));
            assertThat(expenseCount()).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
    }
}
