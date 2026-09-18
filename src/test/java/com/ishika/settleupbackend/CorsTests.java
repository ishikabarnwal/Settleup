package com.ishika.settleupbackend;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

/** The frontend runs on its own origin, so the browser checks with the API first. */
class CorsTests extends ApiTestBase {

    private static final String FRONTEND = "http://localhost:5173";

    @Test
    void allowsTheFrontendToSendTokensAndIdempotencyKeys() throws Exception {
        mockMvc.perform(options("/api/groups/1/expenses")
                        .header("Origin", FRONTEND)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type,idempotency-key"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", FRONTEND))
                .andExpect(header().string("Access-Control-Allow-Methods", containsString("DELETE")));
    }

    @Test
    void answersRealRequestsFromTheFrontendWithTheCorsHeader() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .header("Origin", FRONTEND)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"nobody@example.com","password":"secret123"}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Access-Control-Allow-Origin", FRONTEND));
    }

    @Test
    void refusesOriginsThatAreNotConfigured() throws Exception {
        mockMvc.perform(options("/api/groups")
                        .header("Origin", "https://evil.example.com")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
