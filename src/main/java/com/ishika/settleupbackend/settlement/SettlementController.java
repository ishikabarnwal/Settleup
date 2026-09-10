package com.ishika.settleupbackend.settlement;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups/{groupId}/settlements")
public class SettlementController {

    private final SettlementService settlementService;

    public SettlementController(SettlementService settlementService) {
        this.settlementService = settlementService;
    }

    @PostMapping
    public ResponseEntity<SettlementResponse> record(
            @PathVariable Long groupId, @Valid @RequestBody CreateSettlementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(settlementService.record(groupId, request));
    }

    @GetMapping
    public List<SettlementResponse> list(@PathVariable Long groupId) {
        return settlementService.listForGroup(groupId);
    }

    @GetMapping("/suggested")
    public List<SuggestedPayment> suggested(@PathVariable Long groupId) {
        return settlementService.suggestPayments(groupId);
    }
}
