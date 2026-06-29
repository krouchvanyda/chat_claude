package com.chatapp.repository;

import com.chatapp.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /**
     * Equivalent of Mongoose:
     *   Conversation.find({ participants: userId }).sort({ updatedAt: -1 })
     */
    @Query("select c from Conversation c where :userId member of c.participants order by c.updatedAt desc")
    List<Conversation> findByParticipant(@Param("userId") Long userId);

    /**
     * Equivalent of Mongoose:
     *   Conversation.findOne({ participants: { $all: [userId, otherUserId] } })
     */
    @Query("select c from Conversation c where :userId member of c.participants and :otherUserId member of c.participants")
    Optional<Conversation> findByBothParticipants(@Param("userId") Long userId,
                                                  @Param("otherUserId") Long otherUserId);
}
