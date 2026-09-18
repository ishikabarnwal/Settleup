package com.ishika.settleupbackend.idempotency;

import com.ishika.settleupbackend.exception.BadRequestException;
import com.ishika.settleupbackend.exception.ConflictException;
import com.ishika.settleupbackend.security.CurrentUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

/**
 * Makes a create request safe to retry. A client that isn't sure whether its
 * POST went through (a timeout, a dropped connection) can send it again with
 * the same Idempotency-Key and get the original response back rather than a
 * duplicate expense or payment.
 *
 * <p>Keys belong to the user who sent them. Each one is tied to a fingerprint of
 * the method, path and body, so reusing a key for anything else is a conflict
 * rather than a silent replay of the wrong thing.
 *
 * <p>The key is claimed in the same transaction as the work it guards. If the
 * work fails, the claim is rolled back with it and the key can be retried. If
 * two requests with the same key arrive together, the database's unique index
 * makes the second one wait for the first to commit, after which it replays the
 * stored response.
 */
@Service
public class IdempotencyService {

    public static final String HEADER = "Idempotency-Key";
    public static final String REPLAYED_HEADER = "Idempotent-Replayed";
    static final int MAX_KEY_LENGTH = 255;

    private static final Logger log = LoggerFactory.getLogger(IdempotencyService.class);

    private final IdempotencyRepository repository;
    private final CurrentUser currentUser;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;
    private final Duration window;

    public IdempotencyService(
            IdempotencyRepository repository,
            CurrentUser currentUser,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager,
            @Value("${app.idempotency.window:24h}") Duration window) {
        this.repository = repository;
        this.currentUser = currentUser;
        this.objectMapper = objectMapper;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.window = window;
    }

    /**
     * Runs {@code action} and answers with 201, unless this user has already
     * sent the same request with the same key inside the window, in which case
     * the stored response is returned instead. Without a key the action simply
     * runs.
     */
    public <T> ResponseEntity<T> createOnce(
            String key, String method, String path, Object request, Class<T> responseType, Supplier<T> action) {

        if (key == null) {
            return ResponseEntity.status(HttpStatus.CREATED).body(action.get());
        }
        if (key.isBlank() || key.length() > MAX_KEY_LENGTH) {
            throw new BadRequestException(HEADER + " must be between 1 and " + MAX_KEY_LENGTH + " characters");
        }

        Long userId = currentUser.requireId();
        String requestHash = fingerprint(method, path, request);

        try {
            return transactionTemplate.execute(status -> {
                Optional<IdempotencyRecord> existing = repository.findByUserIdAndKey(userId, key);

                if (existing.isPresent()) {
                    if (!isExpired(existing.get())) {
                        return replay(existing.get(), requestHash, responseType);
                    }
                    repository.delete(existing.get());
                    repository.flush();
                }

                IdempotencyRecord record = claim(new IdempotencyRecord(userId, key, requestHash));
                T response = action.get();
                record.complete(HttpStatus.CREATED.value(), objectMapper.writeValueAsString(response));

                return ResponseEntity.status(HttpStatus.CREATED).body(response);
            });
        } catch (KeyAlreadyClaimed ex) {
            // Someone else got there first. Once their transaction is committed
            // the record is visible and we can answer the same way they were.
            return transactionTemplate.execute(status -> repository
                    .findByUserIdAndKey(userId, key)
                    .map(record -> replay(record, requestHash, responseType))
                    .orElseThrow(() -> new ConflictException(
                            "A request with this " + HEADER + " is still being processed, try again shortly")));
        }
    }

    private IdempotencyRecord claim(IdempotencyRecord record) {
        try {
            return repository.saveAndFlush(record);
        } catch (DataIntegrityViolationException ex) {
            throw new KeyAlreadyClaimed();
        }
    }

    private <T> ResponseEntity<T> replay(IdempotencyRecord record, String requestHash, Class<T> responseType) {
        if (!record.getRequestHash().equals(requestHash)) {
            throw new ConflictException(
                    "This " + HEADER + " has already been used for a different request. Use a new key for a new request.");
        }

        return ResponseEntity.status(record.getResponseStatus())
                .header(REPLAYED_HEADER, "true")
                .body(objectMapper.readValue(record.getResponseBody(), responseType));
    }

    private boolean isExpired(IdempotencyRecord record) {
        return record.getCreatedAt().isBefore(Instant.now().minus(window));
    }

    /**
     * The body is hashed after it has been parsed, so whitespace and field order
     * don't matter, but any change to a value does.
     */
    private String fingerprint(String method, String path, Object request) {
        String canonical = method + " " + path + "\n" + objectMapper.writeValueAsString(request);
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is always available on the JVM", ex);
        }
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT1H")
    void purgeExpired() {
        Integer removed = transactionTemplate.execute(
                status -> repository.deleteCreatedBefore(Instant.now().minus(window)));
        if (removed != null && removed > 0) {
            log.info("Removed {} expired idempotency keys", removed);
        }
    }

    /** Thrown inside the transaction so it rolls back before we look up the winner. */
    private static final class KeyAlreadyClaimed extends RuntimeException {
        KeyAlreadyClaimed() {
            super(null, null, false, false);
        }
    }
}
