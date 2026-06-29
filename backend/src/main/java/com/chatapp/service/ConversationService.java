package com.chatapp.service;

import com.chatapp.model.Conversation;
import com.chatapp.model.Message;
import com.chatapp.model.User;
import com.chatapp.repository.ConversationRepository;
import com.chatapp.repository.MessageRepository;
import com.chatapp.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the "populated" conversation shape the original Mongoose code returned via
 * {@code .populate("participants")} / {@code .populate("lastMessage")}, i.e. the
 * participant ids are replaced with full {@link User} objects and {@code lastMessage}
 * with the full {@link Message} object.
 */
@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    public ConversationService(ConversationRepository conversationRepository,
                               UserRepository userRepository,
                               MessageRepository messageRepository) {
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
    }

    /** GET /api/conversations/:userId — newest first. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getConversationsForUser(Long userId) {
        List<Conversation> conversations = conversationRepository.findByParticipant(userId);
        List<Map<String, Object>> result = new ArrayList<>(conversations.size());
        for (Conversation c : conversations) {
            result.add(populate(c));
        }
        return result;
    }

    /**
     * Returns a JSON-friendly, fully-materialised map representing the conversation
     * with its participants and lastMessage populated. Must be called within an open
     * persistence context (the lazy collections are read here).
     */
    public Map<String, Object> populate(Conversation conversation) {
        List<User> participants = new ArrayList<>();
        for (Long pid : conversation.getParticipants()) {
            userRepository.findById(pid).ifPresent(participants::add);
        }

        Message lastMessage = null;
        if (conversation.getLastMessage() != null) {
            lastMessage = messageRepository.findById(conversation.getLastMessage()).orElse(null);
        }

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("_id", conversation.getId());
        map.put("participants", participants);
        map.put("lastMessage", lastMessage);
        // Copy into a plain map so it serializes safely after the tx closes.
        map.put("unreadCounts", new LinkedHashMap<>(conversation.getUnreadCounts()));
        map.put("createdAt", conversation.getCreatedAt());
        map.put("updatedAt", conversation.getUpdatedAt());
        return map;
    }
}
