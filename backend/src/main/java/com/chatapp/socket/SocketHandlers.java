package com.chatapp.socket;

import com.chatapp.service.ChatService;
import com.corundumstudio.socketio.HandshakeData;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Java port of {@code socket.js}. Registers the Socket.IO event handlers and
 * owns the lifecycle of the netty-socketio server.
 *
 * Events: connection, join, send-message, focus-conversation, disconnect.
 */
@Component
public class SocketHandlers {

    private static final Logger log = LoggerFactory.getLogger(SocketHandlers.class);

    private final SocketIOServer server;
    private final ChatService chatService;

    public SocketHandlers(SocketIOServer server, ChatService chatService) {
        this.server = server;
        this.chatService = chatService;
    }

    @PostConstruct
    public void start() {
        log.info("Socket Handlers initialized");

        server.addConnectListener(client -> {
            Long userId = resolveUserId(client.getHandshakeData());
            client.set("userId", userId);

            log.info("Socket connected: {}", client.getSessionId());

            // Join personal room
            if (userId != null) {
                client.joinRoom(userId.toString());
                log.info("User {} joined their personal room", userId);
            }
        });

        // Join another user's room for chat
        server.addEventListener("join", String.class, (client, otherUserId, ackRequest) -> {
            client.joinRoom(otherUserId);
            log.info("User {} joined a chat with {}", (Long) client.get("userId"), otherUserId);
        });

        server.addEventListener("send-message", SendMessagePayload.class,
                (client, data, ackRequest) -> handleSendMessage(client, data));

        server.addEventListener("focus-conversation", String.class,
                (client, conversationId, ackRequest) -> handleFocusConversation(client, conversationId));

        server.addDisconnectListener(client ->
                log.info("Socket disconnected: {}", client.getSessionId()));

        server.start();
        log.info("Socket.IO server started on port {}", server.getConfiguration().getPort());
    }

    @PreDestroy
    public void stop() {
        if (server != null) {
            server.stop();
        }
    }

    private void handleSendMessage(SocketIOClient client, SendMessagePayload data) {
        Long userId = client.get("userId");
        Long otherUserId = data.getOtherUserId();
        try {
            Map<String, Object> payload = chatService.sendMessage(userId, otherUserId, data.getText());
            // Emit to the recipient's room (excluding the sender)
            server.getRoomOperations(otherUserId.toString())
                    .sendEvent("receive-message", client, payload);
        } catch (Exception e) {
            log.error("Send Message", e);
        }
    }

    private void handleFocusConversation(SocketIOClient client, String conversationId) {
        Long userId = client.get("userId");
        try {
            chatService.focusConversation(userId, Long.valueOf(conversationId));
        } catch (Exception e) {
            log.error("Focus conversation error", e);
        }
    }

    /**
     * Reads the userId from the handshake auth object (preferred) or the query string,
     * matching {@code socket.handshake.auth.userId || socket.handshake.query.userId}.
     */
    @SuppressWarnings("unchecked")
    private Long resolveUserId(HandshakeData handshakeData) {
        Object authToken = handshakeData.getAuthToken();
        if (authToken instanceof Map<?, ?> authMap) {
            Object userId = ((Map<String, Object>) authMap).get("userId");
            Long parsed = parseLong(userId);
            if (parsed != null) {
                return parsed;
            }
        }
        List<String> queryValues = handshakeData.getUrlParams().get("userId");
        if (queryValues != null && !queryValues.isEmpty()) {
            return parseLong(queryValues.get(0));
        }
        return null;
    }

    private Long parseLong(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Long.valueOf(value.toString());
        } catch (NumberFormatException e) {
            log.warn("Ignoring non-numeric userId in handshake: {}", value);
            return null;
        }
    }
}
