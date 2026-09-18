package com.ishika.settleupbackend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;

/** The person who creates a group owns it; everyone else is a regular member. */
class OwnerApiTests extends ApiTestBase {

    private String ownerToken;
    private String memberToken;
    private long groupId;
    private long owner;
    private long member;
    private long third;

    @BeforeEach
    void setUpGroup() throws Exception {
        ownerToken = api.registerAndGetToken("Ishika", "ishika@example.com");
        memberToken = api.registerAndGetToken("Riya", "riya@example.com");
        api.registerAndGetToken("Tara", "tara@example.com");

        groupId = api.idOf(api.postJson("/api/groups", ownerToken, """
                {"name":"Goa Trip"}""")
                .andExpect(status().isCreated()));

        api.postJson(path("/members"), ownerToken, """
                {"email":"riya@example.com"}""")
                .andExpect(status().isOk());

        // Regular members can still invite people.
        api.postJson(path("/members"), memberToken, """
                {"email":"tara@example.com"}""")
                .andExpect(status().isOk());

        JsonNode members = api.json(api.getJson(path(""), ownerToken)).get("members");
        owner = members.get(0).get("id").asLong();
        member = members.get(1).get("id").asLong();
        third = members.get(2).get("id").asLong();
    }

    private String path(String suffix) {
        return "/api/groups/" + groupId + suffix;
    }

    @Test
    void creatorIsTheOwnerAndEveryoneElseIsAMember() throws Exception {
        api.getJson(path(""), memberToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdBy").value(owner))
                .andExpect(jsonPath("$.members[0].role").value("OWNER"))
                .andExpect(jsonPath("$.members[1].role").value("MEMBER"))
                .andExpect(jsonPath("$.members[2].role").value("MEMBER"));
    }

    @Test
    void onlyTheOwnerCanRemoveMembers() throws Exception {
        api.delete(path("/members/" + third), memberToken)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Only the group owner can remove members"));

        // Not even themselves.
        api.delete(path("/members/" + member), memberToken)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Only the group owner can remove members"));

        api.getJson(path(""), ownerToken).andExpect(jsonPath("$.members.length()").value(3));

        api.delete(path("/members/" + third), ownerToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members.length()").value(2));
    }

    @Test
    void theOwnerCannotRemoveThemselves() throws Exception {
        api.delete(path("/members/" + owner), ownerToken)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "The owner can't be removed from the group. Delete the group instead."));
    }

    @Test
    void onlyTheOwnerCanDeleteTheGroup() throws Exception {
        api.delete(path(""), memberToken)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Only the group owner can delete the group"));

        api.getJson(path(""), memberToken).andExpect(status().isOk());

        String outsider = api.registerAndGetToken("Sam", "sam@example.com");
        api.delete(path(""), outsider)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You are not a member of this group"));
    }

    @Test
    void deletingAGroupTakesItsHistoryWithIt() throws Exception {
        api.postJson(path("/expenses"), memberToken, """
                {"description":"Hotel","amount":3000.00,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(owner))
                .andExpect(status().isCreated());
        api.postJson(path("/settlements"), memberToken, """
                {"paidBy":%d,"paidTo":%d,"amount":1000.00}"""
                .formatted(member, owner))
                .andExpect(status().isCreated());

        long otherGroup = api.idOf(api.postJson("/api/groups", memberToken, """
                {"name":"Flat 302"}""")
                .andExpect(status().isCreated()));
        api.postJson("/api/groups/" + otherGroup + "/expenses", memberToken, """
                {"description":"Rent","amount":100.00,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(member))
                .andExpect(status().isCreated());

        api.delete(path(""), ownerToken).andExpect(status().isNoContent());

        api.getJson(path(""), ownerToken)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Group " + groupId + " not found"));
        api.getJson(path("/expenses"), memberToken).andExpect(status().isNotFound());
        api.getJson("/api/groups", memberToken)
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Flat 302"));

        // Only the deleted group's records are gone.
        assertThat(expenseRepository.count()).isEqualTo(1);
        assertThat(settlementRepository.count()).isZero();
    }

    @Test
    void regularMembersKeepEverythingElse() throws Exception {
        long expense = api.idOf(api.postJson(path("/expenses"), memberToken, """
                {"description":"Hotel","amount":300.00,"paidBy":%d,"splitType":"EQUAL"}"""
                .formatted(member))
                .andExpect(status().isCreated()));

        long payment = api.idOf(api.postJson(path("/settlements"), memberToken, """
                {"paidBy":%d,"paidTo":%d,"amount":100.00}"""
                .formatted(owner, member))
                .andExpect(status().isCreated()));

        api.getJson(path("/balances"), memberToken).andExpect(status().isOk());
        api.getJson(path("/settlements/suggested"), memberToken).andExpect(status().isOk());

        api.delete(path("/settlements/" + payment), memberToken).andExpect(status().isNoContent());
        api.delete(path("/expenses/" + expense), memberToken).andExpect(status().isNoContent());
    }
}
