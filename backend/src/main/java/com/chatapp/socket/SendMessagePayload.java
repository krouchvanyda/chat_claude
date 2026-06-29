package com.chatapp.socket;

import lombok.Data;

/** Payload for the {@code send-message} event: {@code { otherUserId, text }}. */
@Data
public class SendMessagePayload {
    private Long otherUserId;
    private String text;
}
