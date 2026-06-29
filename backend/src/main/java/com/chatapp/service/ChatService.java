package com.chatapp.service;

import com.chatapp.model.Conversation;
import com.chatapp.model.Message;
import com.chatapp.repository.ConversationRepository;
import com.chatapp.repository.MessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Transactional write logic behind the Socket.IO events (port of the handlers in
 * the original {@code socket.js}). Each public method runs in its own transaction
 * so the lazy collections used by {@link ConversationService#populate} stay loadable.
 */
@Service
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ConversationService conversationService;

    public ChatService(ConversationRepository conversationRepository,
                       MessageRepository messageRepository,
                       ConversationService conversationService) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.conversationService = conversationService;
    }

    /**
     * Persists a message, bumps the recipient's unread count, updates the
     * conversation's lastMessage, and returns the fully-materialised
     * {@code receive-message} payload: {@code { message, conversation, isNew }}.
     */
    @Transactional
    public Map<String, Object> sendMessage(Long userId, Long otherUserId, String text) {
        // Find or create conversation
        Conversation conversation =
                conversationRepository.findByBothParticipants(userId, otherUserId).orElse(null);

        boolean isNew = false;
        if (conversation == null) {
            isNew = true;
            conversation = new Conversation(List.of(userId, otherUserId));
            conversation = conversationRepository.save(conversation);
        }

        // Save message
        Message message = messageRepository.save(new Message(conversation.getId(), userId, text));

        // Update unread count for the recipient
        int currentUnread = conversation.getUnreadCounts().getOrDefault(otherUserId, 0);
        conversation.getUnreadCounts().put(otherUserId, currentUnread + 1);

        // Update last activity
        conversation.setLastMessage(message.getId());
        conversation = conversationRepository.save(conversation);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("message", message);
        payload.put("conversation", conversationService.populate(conversation));
        payload.put("isNew", isNew);
        return payload;
    }

    /** Resets the caller's unread count for a conversation to 0. */
    @Transactional
    public void focusConversation(Long userId, Long conversationId) {
        conversationRepository.findById(conversationId).ifPresent(conversation -> {
            conversation.getUnreadCounts().put(userId, 0);
            conversationRepository.save(conversation);
        });
    }
}
