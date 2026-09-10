package com.ishika.settleupbackend.expense;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @Query("select distinct e from Expense e "
            + "join fetch e.paidBy "
            + "left join fetch e.shares s "
            + "left join fetch s.user "
            + "where e.group.id = :groupId "
            + "order by e.createdAt desc")
    List<Expense> findAllForGroup(@Param("groupId") Long groupId);

    @Query("select e from Expense e "
            + "join fetch e.paidBy "
            + "left join fetch e.shares s "
            + "left join fetch s.user "
            + "where e.id = :expenseId")
    Optional<Expense> findByIdWithShares(@Param("expenseId") Long expenseId);
}
