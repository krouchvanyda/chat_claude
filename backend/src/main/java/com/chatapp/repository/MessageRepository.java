package com.chatapp.repository;

import com.chatapp.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Message history for a conversation, oldest first. */
    List<Message> findByConversationIdOrderByIdAsc(Long conversationId);
}
