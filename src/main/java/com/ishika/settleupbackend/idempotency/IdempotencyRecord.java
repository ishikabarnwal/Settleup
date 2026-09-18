package com.ishika.settleupbackend.idempotency;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

/**
 * The result of a POST that was sent with an Idempotency-Key, kept so a retry
 * can be answered with the same response instead of doing the work twice.
 *
 * <p>It is written in the same transaction as whatever the request created, so
 * a record exists exactly when that thing does.
 */
@Entity
@Table(
        name = "idempotency_keys",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_idempotency_keys_user_key", columnNames = {"user_id", "idempotency_key"}))
public class IdempotencyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "idempotency_key", nullable = false, updatable = false, length = IdempotencyService.MAX_KEY_LENGTH)
    private String key;

    /** SHA-256 of the method, path and request body, so a reused key can be spotted. */
    @Column(name = "request_hash", nullable = false, updatable = false, length = 64)
    private String requestHash;

    @Column(name = "response_status")
    private Integer responseStatus;

    @Column(name = "response_body", columnDefinition = "text")
    private String responseBody;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected IdempotencyRecord() {
        // for JPA
    }

    IdempotencyRecord(Long userId, String key, String requestHash) {
        this.userId = userId;
        this.key = key;
        this.requestHash = requestHash;
        this.createdAt = Instant.now();
    }

    void complete(int status, String body) {
        this.responseStatus = status;
        this.responseBody = body;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getKey() {
        return key;
    }

    public String getRequestHash() {
        return requestHash;
    }

    public Integer getResponseStatus() {
        return responseStatus;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
