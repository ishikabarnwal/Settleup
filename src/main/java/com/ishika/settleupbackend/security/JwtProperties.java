package com.ishika.settleupbackend.security;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Signing settings for the tokens we hand out. The secret comes from the
 * environment, never from a checked-in file.
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, String issuer, Duration expiration) {

    /** HS256 needs at least 256 bits of key material. */
    private static final int MIN_SECRET_LENGTH = 32;

    public JwtProperties {
        if (secret == null || secret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException(
                    "app.jwt.secret must be set and at least " + MIN_SECRET_LENGTH + " characters long");
        }
        if (issuer == null || issuer.isBlank()) {
            issuer = "settleup";
        }
        if (expiration == null || expiration.isZero() || expiration.isNegative()) {
            expiration = Duration.ofHours(12);
        }
    }
}
