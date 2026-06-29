package com.chatapp.controller;

import com.chatapp.service.ConversationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Mirrors {@code routes/conversationRoutes.js}. */
@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    // GET /api/conversations/:userId
    @GetMapping("/{userId}")
    public List<Map<String, Object>> getConversations(@PathVariable Long userId) {
        return conversationService.getConversationsForUser(userId);
    }
}
