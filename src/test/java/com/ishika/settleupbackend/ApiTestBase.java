package com.ishika.settleupbackend;

import com.ishika.settleupbackend.expense.ExpenseRepository;
import com.ishika.settleupbackend.group.GroupRepository;
import com.ishika.settleupbackend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/**
 * The whole suite shares one in-memory database, so every test starts by
 * emptying it. Order matters here: children before parents, or the foreign keys
 * complain.
 */
@SpringBootTest
@AutoConfigureMockMvc
abstract class ApiTestBase {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected GroupRepository groupRepository;

    @Autowired
    protected ExpenseRepository expenseRepository;

    protected TestApiClient api;

    @BeforeEach
    void resetDatabase() {
        expenseRepository.deleteAll();
        groupRepository.deleteAll();
        userRepository.deleteAll();
        api = new TestApiClient(mockMvc, objectMapper);
    }
}
