package com.ishika.settleupbackend.config;

import java.util.List;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.util.StringUtils;

/**
 * Under the prod profile, stops the app before it starts if any required
 * environment variable is missing or blank, naming all of them at once.
 *
 * Without this, a missing variable shows up later as a confusing database or
 * token error, and a blank CORS_ALLOWED_ORIGINS doesn't fail at all: the app
 * starts and quietly rejects every request from the frontend.
 */
public class ProductionSettings implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    static final List<String> REQUIRED = List.of(
            "DB_HOST", "DB_PORT", "DB_NAME", "DB_USERNAME", "DB_PASSWORD", "JWT_SECRET", "CORS_ALLOWED_ORIGINS");

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        check(event.getEnvironment());
    }

    static void check(Environment environment) {
        if (!environment.acceptsProfiles(Profiles.of("prod"))) {
            return;
        }
        List<String> missing = REQUIRED.stream()
                .filter(name -> !StringUtils.hasText(environment.getProperty(name)))
                .toList();
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "The prod profile needs these environment variables, which are missing or blank: "
                            + String.join(", ", missing));
        }
    }
}
