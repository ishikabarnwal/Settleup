package com.ishika.settleupbackend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;

class GroupApiTests extends ApiTestBase {

    @Test
    void creatorBecomesTheFirstMember() throws Exception {
        String token = api.registerAndGetToken("Ishika", "ishika@example.com");

        long groupId = api.idOf(api.postJson("/api/groups", token, """
                {"name":"Goa Trip","description":"December plans"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.memberCount").value(1)));

        api.getJson("/api/groups/" + groupId, token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Goa Trip"))
                .andExpect(jsonPath("$.members.length()").value(1))
                .andExpect(jsonPath("$.members[0].email").value("ishika@example.com"));
    }

    @Test
    void addsMemberByEmailAndListsGroupsForBoth() throws Exception {
        String owner = api.registerAndGetToken("Ishika", "ishika@example.com");
        String friend = api.registerAndGetToken("Riya", "riya@example.com");

        long groupId = api.idOf(api.postJson("/api/groups", owner, """
                {"name":"Flat 302"}""")
                .andExpect(status().isCreated()));

        api.getJson("/api/groups", friend)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        api.postJson("/api/groups/" + groupId + "/members", owner, """
                {"email":"RIYA@example.com"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members.length()").value(2));

        api.getJson("/api/groups", friend)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Flat 302"))
                .andExpect(jsonPath("$[0].memberCount").value(2));
    }

    @Test
    void nonMemberCannotSeeOrChangeGroup() throws Exception {
        String owner = api.registerAndGetToken("Ishika", "ishika@example.com");
        String outsider = api.registerAndGetToken("Sam", "sam@example.com");

        long groupId = api.idOf(api.postJson("/api/groups", owner, """
                {"name":"Private"}""")
                .andExpect(status().isCreated()));

        api.getJson("/api/groups/" + groupId, outsider)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You are not a member of this group"));

        api.postJson("/api/groups/" + groupId + "/members", outsider, """
                {"email":"sam@example.com"}""")
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsDuplicateMemberAndUnknownEmail() throws Exception {
        String owner = api.registerAndGetToken("Ishika", "ishika@example.com");

        long groupId = api.idOf(api.postJson("/api/groups", owner, """
                {"name":"Trip"}""")
                .andExpect(status().isCreated()));

        api.postJson("/api/groups/" + groupId + "/members", owner, """
                {"email":"ishika@example.com"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Ishika is already in this group"));

        api.postJson("/api/groups/" + groupId + "/members", owner, """
                {"email":"ghost@example.com"}""")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("No user is registered with ghost@example.com"));
    }

    @Test
    void missingGroupReturnsNotFoundAndBlankNameIsRejected() throws Exception {
        String token = api.registerAndGetToken("Ishika", "ishika@example.com");

        api.getJson("/api/groups/9999", token).andExpect(status().isNotFound());

        api.postJson("/api/groups", token, """
                {"name":"  "}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").isNotEmpty());
    }

    @Test
    void groupEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/groups")).andExpect(status().isUnauthorized());
    }
}
