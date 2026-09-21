package com.ishika.settleupbackend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

class ApiDocsTests extends ApiTestBase {

    @Test
    void openApiSpecIsPublicAndCoversTheApi() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("SettleUp API"))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
                .andExpect(jsonPath("$.paths['/api/groups/{groupId}/expenses'].post").exists())
                .andExpect(jsonPath("$.paths['/api/groups/{groupId}/members/{userId}'].delete").exists())
                .andExpect(jsonPath("$.paths['/api/groups/{groupId}/settlements/{settlementId}'].delete").exists())
                .andExpect(jsonPath("$.paths['/api/groups/{groupId}/expenses'].post.parameters[?(@.name == 'Idempotency-Key')]")
                        .exists());
    }

    @Test
    void swaggerUiIsServedWithoutAToken() throws Exception {
        mockMvc.perform(get("/swagger-ui.html"))
                .andExpect(status().isFound())
                .andExpect(redirectedUrl("/swagger-ui/index.html"));

        mockMvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
    }
}
