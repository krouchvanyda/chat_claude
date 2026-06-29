package com.chatapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Entry point. Mirrors the original Node {@code server.js}:
 *  - boots the HTTP/REST layer (Spring MVC on {@code server.port})
 *  - connects to PostgreSQL (Flyway applies migrations on boot)
 *  - starts the Socket.IO server (see {@code SocketIOConfig})
 *
 * {@link EnableJpaAuditing} powers the {@code createdAt}/{@code updatedAt}
 * audit columns, replacing Mongoose's {@code timestamps: true}.
 */
@SpringBootApplication
@EnableJpaAuditing
public class ChatApplication {
    public static void main(String[] args) {
        SpringApplication.run(ChatApplication.class, args);
    }
}
