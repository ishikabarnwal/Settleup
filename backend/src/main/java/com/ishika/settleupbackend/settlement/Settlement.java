package com.ishika.settleupbackend.settlement;

import com.ishika.settleupbackend.group.Group;
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
import java.time.Instant;
import java.util.Objects;

/** A payment one member actually made to another to square up. */
@Entity
@Table(name = "settlements")
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false, updatable = false)
    private Group group;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "paid_by", nullable = false)
    private User paidBy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "paid_to", nullable = false)
    private User paidTo;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(length = 200)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recorded_by", nullable = false, updatable = false)
    private User recordedBy;

    @Column(name = "settled_at", nullable = false, updatable = false)
    private Instant settledAt;

    protected Settlement() {
        // for JPA
    }

    public Settlement(Group group, User paidBy, User paidTo, BigDecimal amount, String note, User recordedBy) {
        this.group = group;
        this.paidBy = paidBy;
        this.paidTo = paidTo;
        this.amount = amount;
        this.note = note;
        this.recordedBy = recordedBy;
        this.settledAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Group getGroup() {
        return group;
    }

    public User getPaidBy() {
        return paidBy;
    }

    public User getPaidTo() {
        return paidTo;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getNote() {
        return note;
    }

    public User getRecordedBy() {
        return recordedBy;
    }

    public Instant getSettledAt() {
        return settledAt;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof Settlement settlement)) {
            return false;
        }
        return id != null && id.equals(settlement.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
