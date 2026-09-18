package com.ishika.settleupbackend.config;

import com.ishika.settleupbackend.expense.SplitType;
import jakarta.persistence.EntityManagerFactory;
import java.util.Arrays;
import java.util.stream.Collectors;
import javax.sql.DataSource;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.JdbcUtils;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * On Postgres, Hibernate backs the split_type column with a check constraint
 * listing the enum values it saw when it first created the table. ddl-auto=update
 * never revisits that constraint, so a database created before a split type was
 * added would reject the new value. This rebuilds the constraint from the enum on
 * every start, which keeps the database strict without needing a manual fix.
 *
 * <p>Taking the EntityManagerFactory as a dependency makes this run after
 * Hibernate has updated the schema and before the app starts serving requests.
 */
@Component
class SplitTypeConstraint implements InitializingBean {

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;

    SplitTypeConstraint(
            DataSource dataSource,
            JdbcTemplate jdbcTemplate,
            PlatformTransactionManager transactionManager,
            EntityManagerFactory entityManagerFactory) {
        this.dataSource = dataSource;
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        String database = JdbcUtils.extractDatabaseMetaData(dataSource, metaData -> metaData.getDatabaseProductName());
        if (!"PostgreSQL".equals(database)) {
            return;
        }

        String allowed = Arrays.stream(SplitType.values())
                .map(type -> "'" + type.name() + "'")
                .collect(Collectors.joining(", "));

        transactionTemplate.executeWithoutResult(status -> {
            jdbcTemplate.execute("alter table expenses drop constraint if exists expenses_split_type_check");
            jdbcTemplate.execute("alter table expenses add constraint expenses_split_type_check "
                    + "check (split_type in (" + allowed + "))");
        });
    }
}
