package com.ishika.settleupbackend.group;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GroupRepository extends JpaRepository<Group, Long> {

    @Query("select g from Group g join g.members m where m.id = :userId order by g.createdAt desc")
    List<Group> findAllForMember(@Param("userId") Long userId);

    @Query("select g from Group g left join fetch g.members where g.id = :id")
    Optional<Group> findByIdWithMembers(@Param("id") Long id);
}
