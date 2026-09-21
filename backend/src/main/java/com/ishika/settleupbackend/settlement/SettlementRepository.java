package com.ishika.settleupbackend.settlement;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    @Query("select s from Settlement s "
            + "join fetch s.paidBy "
            + "join fetch s.paidTo "
            + "where s.group.id = :groupId "
            + "order by s.settledAt desc")
    List<Settlement> findAllForGroup(@Param("groupId") Long groupId);
}
