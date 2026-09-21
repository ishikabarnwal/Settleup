package com.ishika.settleupbackend.expense;

import com.ishika.settleupbackend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.Objects;

/** One person's slice of an expense. */
@Entity
@Table(name = "expense_shares")
public class ExpenseShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    protected ExpenseShare() {
        // for JPA
    }

    ExpenseShare(Expense expense, User user, BigDecimal amount) {
        this.expense = expense;
        this.user = user;
        this.amount = amount;
    }

    public Long getId() {
        return id;
    }

    public Expense getExpense() {
        return expense;
    }

    public User getUser() {
        return user;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ExpenseShare share)) {
            return false;
        }
        return id != null && id.equals(share.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
