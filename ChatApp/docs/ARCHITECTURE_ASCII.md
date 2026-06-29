# ChatApp — Architecture (ASCII)

Plain-text diagrams (monospace). For rendered/drawn versions see `CHAT_FLOW.md`.

## 1. System architecture

```
                              REST  :5001
   ┌──────────────────┐  ──────────────────────▶  ┌─────────────────────────────┐
   │   Mobile app     │       HTTP requests        │    Spring Boot (Tomcat)     │
   │  (React Native)  │  ◀──────────────────────   │    Controllers → Services   │
   │                  │       JSON responses       │                             │
   │  ┌────────────┐  │                            │    UserController           │
   │  │ REST client│  │                            │    ConversationController   │
   │  │  (Axios)   │  │                            │    MessageController        │
   │  └────────────┘  │                            │                             │
   │                  │     Socket.IO  :5002       │    netty-socketio server    │
   │  ┌────────────┐  │  ◀═════════════════════▶   │    SocketHandlers           │
   │  │ Socket.IO  │  │   persistent WebSocket     │         │                   │
   │  │   client   │  │                            │         ▼                   │
   │  └────────────┘  │                            │    ChatService              │
   └──────────────────┘                            │    (@Transactional)         │
                                                   └──────────────┬──────────────┘
                                                                  │  JPA / Hibernate
                                                                  ▼
                                                        ┌──────────────────┐
                                                        │    PostgreSQL    │  :5433
                                                        │     (chatapp)    │
                                                        └──────────────────┘
```

## 2. Send / receive a message (Bin ➜ Van)

```
   Bin  (sender)                  Backend                       Van  (recipient)
   ┌────────────┐          ┌────────────────────┐               ┌────────────┐
   │ ChatScreen │          │  Socket.IO  :5002  │               │   Chats /  │
   │            │          │  ChatService       │               │ ChatScreen │
   └─────┬──────┘          └─────────┬──────────┘               └─────┬──────┘
         │  emit "send-message"      │                                │
         │  { otherUserId, text }    │                                │
         ├──────────────────────────▶│                                │
         │                           │  save message + conversation   │
         │  (optimistic bubble       │  bump unread, set lastMessage  │
         │   shown immediately)      │      ──▶ [ PostgreSQL ]         │
         │                           │                                │
         │                           │  emit "receive-message"        │
         │                           │  { message, conversation }     │
         │                           ├───────────────────────────────▶│
         │                           │     (sender is EXCLUDED)        │ upsertConversation
         │                           │                                │ + addMessage
         ▼                           ▼                                ▼
```

## 3. Open a chat & load history

```
   ChatScreen                REST :5001              Socket.IO :5002
   ┌────────────┐           ┌──────────┐            ┌──────────────┐
   │   opens    │           │          │            │              │
   └─────┬──────┘           └────┬─────┘            └──────┬───────┘
         │  GET /api/messages/{conversationId}             │
         ├────────────────────────▶│                       │
         │   [ messages oldest-first ]                     │
         │◀────────────────────────┤                       │
         │  dispatch(setMessages)   │                       │
         │                                                 │
         │  emit "join" (otherUserId)                      │
         ├────────────────────────────────────────────────▶│
         │  emit "focus-conversation" (id)  → unread = 0    │
         ├────────────────────────────────────────────────▶│
         │  on "receive-message" → addMessage (live)        │
         │◀────────────────────────────────────────────────┤
```

## 4. Navigation map

```
   ┌─────────┐   ┌───────┐   ┌─────┐   ┌───────────────┐
   │ Welcome │──▶│ Login │──▶│ OTP │──▶│ Account Setup │──┐  reset()
   └─────────┘   └───────┘   └─────┘   └───────────────┘  │
                                                          ▼
                                                ┌───────────────────┐
                                                │       Tabs        │
                                                │ ┌───────┐ ┌──────┐│
                                                │ │ Chats │ │Updates││
                                                │ └───┬───┘ └──────┘│
                                                │ ┌───┴───┐ ┌──────┐│
                                                │ │Commun.│ │ Calls ││
                                                │ └───────┘ └──────┘│
                                                └───────┬───────────┘
                              tap + (FAB) │             │ tap a conversation
                                          ▼             ▼
                                   ┌─────────┐     ┌──────────┐   tap 📞 / 🎥
                                   │ NewChat │────▶│   Chat   │──────────────┐
                                   └─────────┘     └──────────┘  (permission)│
                                    user found                               ▼
                                                                       ┌──────────┐
                                                                       │   Call   │
                                                                       └──────────┘
```

## 5. One-way data flow (per layer)

```
        dispatch(thunk / action)                  thunks call
   UI ───────────────────────────▶  Redux store  ───────────────▶  api/* (Axios) ──▶ REST :5001
   (screens)                        authSlice                       services/socket ─▶ IO  :5002
      ▲                             chatSlice                              │
      │       useSelector (read)        ▲                                  │  events
      └─────────────────────────────────┘  ◀───── state updates ──────────┘
                                                (results / receive-message)
```

## Ports & endpoints

```
   REST   http://<HOST>:5001/api   GET /users/{phone} · POST/PUT /users
                                   GET /conversations/{userId} · GET /messages/{conversationId}
   Socket http://<HOST>:5002       connect{auth:userId} · join · send-message ·
                                   focus-conversation · receive-message
   DB     postgres://<HOST>:5433/chatapp
```
