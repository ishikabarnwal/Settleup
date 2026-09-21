package com.ishika.settleupbackend.settlement;

import com.ishika.settleupbackend.idempotency.IdempotencyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups/{groupId}/settlements")
public class SettlementController {

    private final SettlementService settlementService;
    private final IdempotencyService idempotencyService;

    public SettlementController(SettlementService settlementService, IdempotencyService idempotencyService) {
        this.settlementService = settlementService;
        this.idempotencyService = idempotencyService;
    }

    @PostMapping
    public ResponseEntity<SettlementResponse> record(
            @PathVariable Long groupId,
            @RequestHeader(name = IdempotencyService.HEADER, required = false) String idempotencyKey,
            @Valid @RequestBody CreateSettlementRequest request,
            HttpServletRequest http) {
        return idempotencyService.createOnce(
                idempotencyKey, http.getMethod(), http.getRequestURI(), request, SettlementResponse.class,
                () -> settlementService.record(groupId, request));
    }

    @GetMapping
    public List<SettlementResponse> list(@PathVariable Long groupId) {
        return settlementService.listForGroup(groupId);
    }

    @DeleteMapping("/{settlementId}")
    public ResponseEntity<Void> delete(@PathVariable Long groupId, @PathVariable Long settlementId) {
        settlementService.delete(groupId, settlementId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/suggested")
    public List<SuggestedPayment> suggested(@PathVariable Long groupId) {
        return settlementService.suggestPayments(groupId);
    }
}
