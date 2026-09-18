package com.ishika.settleupbackend.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.ishika.settleupbackend.PostgresTestConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * A database created before PERCENTAGE existed still has a check constraint that
 * only allows EQUAL and EXACT. This only shows up on Postgres, which is exactly
 * what H2 used to hide from the suite.
 *
 * <p>Same annotations as the API tests so it reuses their context and container.
 */
@SpringBootTest
@Import(PostgresTestConfig.class)
@AutoConfigureMockMvc
class SplitTypeConstraintTests {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private SplitTypeConstraint splitTypeConstraint;

    @Test
    void widensAConstraintLeftBehindByAnOlderSchema() throws Exception {
        jdbcTemplate.execute("alter table expenses drop constraint if exists expenses_split_type_check");
        jdbcTemplate.execute("alter table expenses add constraint expenses_split_type_check "
                + "check (split_type in ('EQUAL', 'EXACT'))");

        splitTypeConstraint.afterPropertiesSet();

        String definition = jdbcTemplate.queryForObject(
                "select pg_get_constraintdef(oid) from pg_constraint where conname = 'expenses_split_type_check'",
                String.class);

        assertThat(definition).contains("'EQUAL'", "'EXACT'", "'PERCENTAGE'");
    }
}
