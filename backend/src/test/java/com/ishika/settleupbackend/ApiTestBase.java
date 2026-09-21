package com.ishika.settleupbackend;

import com.ishika.settleupbackend.expense.ExpenseRepository;
import com.ishika.settleupbackend.group.GroupRepository;
import com.ishika.settleupbackend.idempotency.IdempotencyRepository;
import com.ishika.settleupbackend.settlement.SettlementRepository;
import com.ishika.settleupbackend.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/**
 * The whole suite shares one Postgres container, so every test starts by
 * emptying it. Order matters here: children before parents, or the foreign keys
 * complain.
 */
@SpringBootTest
@Import(PostgresTestConfig.class)
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

    @Autowired
    protected SettlementRepository settlementRepository;

    @Autowired
    protected IdempotencyRepository idempotencyRepository;

    protected TestApiClient api;

    @BeforeEach
    void resetDatabase() {
        idempotencyRepository.deleteAll();
        settlementRepository.deleteAll();
        expenseRepository.deleteAll();
        groupRepository.deleteAll();
        userRepository.deleteAll();
        api = new TestApiClient(mockMvc, objectMapper);
    }
}
