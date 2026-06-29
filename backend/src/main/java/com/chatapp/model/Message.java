package com.chatapp.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Mirrors Mongoose {@code models/Message.js}, now a JPA entity on the {@code messages} table.
 * {@code conversationId} and {@code senderId} are stored as plain ids, matching the
 * un-populated shape the original socket layer emitted.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "messages")
public class Message extends AuditableEntity {

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(columnDefinition = "text")
    private String text = "";

    /** One of: sent, delivered, seen. */
    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private Status status;

    public enum Status {
        sent, delivered, seen
    }

    public Message(Long conversationId, Long senderId, String text) {
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.text = text;
    }
}
