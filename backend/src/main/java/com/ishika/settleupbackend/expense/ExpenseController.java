package com.ishika.settleupbackend.expense;

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
@RequestMapping("/api/groups/{groupId}/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final IdempotencyService idempotencyService;

    public ExpenseController(ExpenseService expenseService, IdempotencyService idempotencyService) {
        this.expenseService = expenseService;
        this.idempotencyService = idempotencyService;
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> create(
            @PathVariable Long groupId,
            @RequestHeader(name = IdempotencyService.HEADER, required = false) String idempotencyKey,
            @Valid @RequestBody CreateExpenseRequest request,
            HttpServletRequest http) {
        return idempotencyService.createOnce(
                idempotencyKey, http.getMethod(), http.getRequestURI(), request, ExpenseResponse.class,
                () -> expenseService.create(groupId, request));
    }

    @GetMapping
    public List<ExpenseResponse> list(@PathVariable Long groupId) {
        return expenseService.listForGroup(groupId);
    }

    @GetMapping("/{expenseId}")
    public ExpenseResponse getOne(@PathVariable Long groupId, @PathVariable Long expenseId) {
        return expenseService.getOne(groupId, expenseId);
    }

    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> delete(@PathVariable Long groupId, @PathVariable Long expenseId) {
        expenseService.delete(groupId, expenseId);
        return ResponseEntity.noContent().build();
    }
}
