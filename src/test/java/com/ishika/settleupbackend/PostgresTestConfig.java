package com.ishika.settleupbackend;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * The test suite runs against a real, throwaway Postgres rather than an
 * in-memory stand-in, using the same image as docker-compose.yml. Spring points
 * the datasource at it through @ServiceConnection, and because every test
 * shares one cached application context, the container is started once for the
 * whole run. Docker has to be running.
 */
@TestConfiguration(proxyBeanMethods = false)
public class PostgresTestConfig {

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgres() {
        return new PostgreSQLContainer("postgres:17-alpine");
    }
}
