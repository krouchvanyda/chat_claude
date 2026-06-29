-- ============================================================================
-- V1__init_chat.sql
-- Initial chat schema (PostgreSQL), converted from the Node/Mongoose models:
--   User, Conversation, Message.
-- ============================================================================

-- ---- users -----------------------------------------------------------------
CREATE TABLE users (
    id            BIGSERIAL     PRIMARY KEY,
    phone         VARCHAR(32)   NOT NULL UNIQUE,
    name          VARCHAR(255),
    profile_image VARCHAR(1024),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---- conversations ---------------------------------------------------------
CREATE TABLE conversations (
    id              BIGSERIAL    PRIMARY KEY,
    last_message_id BIGINT,                                 -- denormalised for inbox preview
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---- conversation participants (Mongo: participants[]) ---------------------
CREATE TABLE conversation_participants (
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL
);
CREATE INDEX idx_conversation_participants_user ON conversation_participants (user_id);
CREATE INDEX idx_conversation_participants_conv ON conversation_participants (conversation_id);

-- ---- per-user unread counts (Mongo: unreadCounts Map) ----------------------
CREATE TABLE conversation_unread_counts (
    conversation_id BIGINT  NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         BIGINT  NOT NULL,
    unread_count    INTEGER NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

-- ---- messages --------------------------------------------------------------
CREATE TABLE messages (
    id              BIGSERIAL    PRIMARY KEY,
    conversation_id BIGINT       NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       BIGINT       NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    text            TEXT         DEFAULT '',
    status          VARCHAR(16),                            -- sent | delivered | seen
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender       ON messages (sender_id);

-- last_message_id references a message (added after both tables exist)
ALTER TABLE conversations
    ADD CONSTRAINT fk_conversations_last_message
        FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;
