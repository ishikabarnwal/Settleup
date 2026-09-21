package com.ishika.settleupbackend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Small helper so the tests read as API calls rather than MockMvc boilerplate. */
class TestApiClient {

    private final MockMvc mockMvc;
    private final ObjectMapper objectMapper;

    TestApiClient(MockMvc mockMvc, ObjectMapper objectMapper) {
        this.mockMvc = mockMvc;
        this.objectMapper = objectMapper;
    }

    String registerAndGetToken(String name, String email) throws Exception {
        String payload = "{\"name\":\"%s\",\"email\":\"%s\",\"password\":\"secret123\"}".formatted(name, email);

        String body = mockMvc.perform(
                        post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(body).get("token").asString();
    }

    ResultActions postJson(String path, String token, String json) throws Exception {
        return mockMvc.perform(post(path)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    ResultActions postJson(String path, String token, String idempotencyKey, String json) throws Exception {
        return mockMvc.perform(post(path)
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", idempotencyKey)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    ResultActions getJson(String path, String token) throws Exception {
        return mockMvc.perform(get(path).header("Authorization", "Bearer " + token));
    }

    ResultActions delete(String path, String token) throws Exception {
        return mockMvc.perform(MockMvcRequestBuilders.delete(path).header("Authorization", "Bearer " + token));
    }

    JsonNode json(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString());
    }

    long idOf(ResultActions actions) throws Exception {
        return json(actions).get("id").asLong();
    }
}
