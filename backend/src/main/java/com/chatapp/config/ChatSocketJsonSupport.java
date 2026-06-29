package com.chatapp.config;

import com.corundumstudio.socketio.protocol.JacksonJsonSupport;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * netty-socketio uses its OWN ObjectMapper (not Spring's), so the Jackson config
 * from {@code application.yml} doesn't apply to Socket.IO payloads. Without this,
 * serializing a {@code java.time.Instant} (e.g. Message.createdAt) in the
 * {@code receive-message} event fails with "Java 8 date/time type not supported".
 *
 * This registers the JavaTime module and mirrors the REST conventions:
 * ISO-8601 dates (not epoch numbers) and omit null fields.
 */
public class ChatSocketJsonSupport extends JacksonJsonSupport {

    public ChatSocketJsonSupport() {
        super(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        objectMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
    }
}
