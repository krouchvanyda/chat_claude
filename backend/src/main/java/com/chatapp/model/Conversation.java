package com.chatapp.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Mirrors Mongoose {@code models/Conversation.js}, now a JPA entity on the
 * {@code conversations} table.
 *
 * The two embedded structures from the Mongo document become side tables via
 * {@link ElementCollection}:
 *  - participants  -> {@code conversation_participants(conversation_id, user_id)}
 *  - unreadCounts  -> {@code conversation_unread_counts(conversation_id, user_id, unread_count)}
 *
 * Population (returning full User / Message objects, the way {@code .populate()} did)
 * is done in {@code ConversationService}.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "conversations")
public class Conversation extends AuditableEntity {

    /** Exactly two user ids. */
    @ElementCollection
    @CollectionTable(
            name = "conversation_participants",
            joinColumns = @JoinColumn(name = "conversation_id"))
    @Column(name = "user_id", nullable = false)
    private List<Long> participants = new ArrayList<>();

    /** Id of the last message (denormalised for the inbox preview). */
    @Column(name = "last_message_id")
    private Long lastMessage;

    /** Per-user unread message count, keyed by user id. */
    @ElementCollection
    @CollectionTable(
            name = "conversation_unread_counts",
            joinColumns = @JoinColumn(name = "conversation_id"))
    @MapKeyColumn(name = "user_id")
    @Column(name = "unread_count", nullable = false)
    private Map<Long, Integer> unreadCounts = new HashMap<>();

    public Conversation(List<Long> participants) {
        // Defensive mutable copy: callers may pass an immutable List.of(...),
        // which Hibernate cannot clear()/replace during a merge (second save),
        // throwing UnsupportedOperationException and rolling back the message.
        this.participants = new ArrayList<>(participants);
    }
}
