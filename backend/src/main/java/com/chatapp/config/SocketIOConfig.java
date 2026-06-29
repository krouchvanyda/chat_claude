package com.chatapp.config;

import com.corundumstudio.socketio.SocketConfig;
import com.corundumstudio.socketio.SocketIOServer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Creates and configures the netty-socketio server (the Java equivalent of the
 * {@code new Server(server, { cors: ... })} in the original {@code server.js}).
 *
 * netty-socketio cannot share Tomcat's HTTP port, so it binds its own
 * ({@code app.socketio.port}). Point the mobile client's socket connection there.
 */
@Configuration
public class SocketIOConfig {

    @Value("${app.socketio.host}")
    private String host;

    @Value("${app.socketio.port}")
    private int port;

    @Bean
    public SocketIOServer socketIOServer() {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setHostname(host);
        config.setPort(port);
        config.setOrigin(null); // allow any origin, like cors origin "*"

        // netty-socketio's own ObjectMapper needs the JavaTime module to serialize
        // Instant fields (e.g. Message.createdAt) in emitted events.
        config.setJsonSupport(new ChatSocketJsonSupport());

        SocketConfig socketConfig = new SocketConfig();
        socketConfig.setReuseAddress(true);
        config.setSocketConfig(socketConfig);

        return new SocketIOServer(config);
    }
}
