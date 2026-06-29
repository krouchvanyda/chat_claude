# ChatApp — Chat Flow & Architecture

Diagrams below are written in **Mermaid**. They render automatically in:
- VS Code (install the *Markdown Preview Mermaid Support* extension, then open Preview)
- GitHub / GitLab markdown
- Any Mermaid live editor (https://mermaid.live)

---

## 1. Layered architecture (one-way data flow)

UI reads from Redux via selectors and writes by dispatching thunks/actions.
Data and transport layers are the only boundary to the backend.

```mermaid
flowchart TD
  subgraph UI["UI — screens / components / navigation"]
    SC[Screens]
  end
  subgraph STATE["State — Redux Toolkit (single source of truth)"]
    AUTH[authSlice<br/>user]
    CHAT[chatSlice<br/>conversations · messagesByUser]
  end
  subgraph DATA["Data / Transport"]
    API["api/* (Axios)<br/>client · users · conversations · messages"]
    SOCK["services/socket.js<br/>(socket.io-client)"]
  end
  subgraph BE["Backend — Java / Spring Boot + netty-socketio"]
    REST["REST API :5001"]
    IO["Socket.IO :5002"]
    DB[(PostgreSQL)]
  end

  SC -- "dispatch(thunk/action)" --> STATE
  STATE -- "useSelector (read)" --> SC
  STATE -- "thunks call" --> API
  SC -- "emit / on" --> SOCK
  API -- "HTTP" --> REST
  SOCK -- "WebSocket events" --> IO
  REST --> DB
  IO --> DB
  REST -- "results land in state" --> STATE
  IO -- "receive-message" --> SOCK
```

---

## 2. Navigation graph

```mermaid
flowchart LR
  Welcome --> Login --> Otp --> AccountSetup --> Tabs
  AccountSetup -. "reset on success" .-> Tabs

  subgraph Tabs["Tabs (bottom-tabs)"]
    Chats
    Updates
    Communities
    Calls
  end

  Chats -- "tap conversation" --> Chat
  Chats -- "tap + (FAB)" --> NewChat
  NewChat -- "user found" --> Chat
  Chat -- "tap 📞 / 🎥 (after permission)" --> Call
```

`RootNavigator` chooses the initial route from `auth.user`: **Tabs** when logged in,
otherwise **Welcome**.

---

## 3. Startup & auth lifecycle (`App.js`)

```mermaid
sequenceDiagram
  participant App as App.js (AppContent)
  participant Store as Redux (authSlice)
  participant Storage as AsyncStorage
  participant Socket as services/socket.js
  participant Nav as RootNavigator

  App->>Store: dispatch(loadUserFromStorage())
  Store->>Storage: read persisted user
  Storage-->>Store: user | null
  Store-->>App: bootstrapped = true
  alt user exists
    App->>Socket: connectSocket(user._id)
    Note over Socket: io(SOCKET_URL,<br/>auth:{userId}, query:{userId})
    App->>Nav: initialRoute = "Tabs"
  else no user
    App->>Nav: initialRoute = "Welcome"
  end
  Note over App,Socket: on logout / user change → disconnectSocket()
```

> **Fix applied:** `receive-message` subscribers are stored in a module-level Set in
> `socket.js`, so a screen can subscribe **before** the socket connects (ChatsScreen
> mounts before `connectSocket` runs) and still receive events.

---

## 4. Account funnel (Welcome → Tabs)

```mermaid
flowchart TD
  W[Welcome] --> L[Login: enter phone]
  L --> O[OTP: client-generated demo code]
  O -->|code matches| AS[Account Setup]
  AS -->|"GET /api/users/{phone}"| Q{User exists?}
  Q -->|"404 (new)"| New[Empty form]
  Q -->|"200 (existing)"| Pre[Prefill name + photo]
  New --> Save
  Pre --> Save["Save & Continue"]
  Save -->|"id ? PUT : POST /api/users (multipart)"| Persist[(user row)]
  Persist --> SetUser["dispatch(setUser) → AsyncStorage"]
  SetUser --> Tabs["navigation.reset → Tabs"]
```

---

## 5. Start a new chat (NewChat)

```mermaid
flowchart TD
  FAB["Chats: tap + (FAB)"] --> NC[NewChat screen]
  NC --> In[Enter phone number]
  In --> Btn[Tap “Start chat”]
  Btn -->|"GET /api/users/{phone}"| R{Result}
  R -->|"404 / undefined"| NF["Alert: No user found"]
  R -->|"is current user"| Self["Alert: That's you"]
  R -->|"other user"| Open["navigate('Chat', { otherUser })"]
  Tip["ChatScreen works without a<br/>conversationId — backend creates<br/>the conversation on first send"]
  Open --- Tip
```

---

## 6. Realtime messaging — send & receive

Bin sends a message to Van. The backend persists it and pushes it to Van's room
(the sender is excluded). The sender shows the message optimistically.

```mermaid
sequenceDiagram
  autonumber
  participant Bin as Bin · ChatScreen
  participant SB as Bin socket
  participant IO as Socket.IO server
  participant DB as PostgreSQL
  participant SV as Van socket
  participant Van as Van · Chats/Chat

  Bin->>SB: sendMessage(otherUserId, text)
  Bin->>Bin: dispatch(addMessage) — optimistic bubble
  SB->>IO: emit "send-message" { otherUserId, text }
  IO->>DB: find/create conversation,<br/>save message, bump unread, set lastMessage
  DB-->>IO: saved
  IO->>SV: emit "receive-message"<br/>{ message, conversation, isNew }
  Note over IO,SB: sender is EXCLUDED from the emit
  SV->>Van: ChatsScreen → upsertConversation (list updates)
  SV->>Van: ChatScreen (if open) → addMessage (thread updates)
```

> **Backend fix:** the conversation was created with an **immutable** `List.of(...)`
> for participants; Hibernate's merge on the 2nd save called `clear()` on it →
> `UnsupportedOperationException` → rollback → nothing saved. Now copied into a
> mutable `ArrayList`.
>
> **Client fix:** messages carry `senderId` (backend) or `sender` (optimistic); the
> `senderId()` helper accepts **either**, so live messages are no longer dropped.

---

## 7. Open a chat & load history

```mermaid
sequenceDiagram
  autonumber
  participant Scr as ChatScreen
  participant REST as REST :5001
  participant IO as Socket.IO :5002
  participant Store as chatSlice

  Note over Scr: opened from Chats (has conversationId)<br/>or NewChat (no conversationId yet)
  alt conversationId present
    Scr->>REST: GET /api/messages/{conversationId}
    REST-->>Scr: [ messages oldest-first ]
    Scr->>Store: setMessages({ otherUserId, messages })
  end
  Scr->>IO: emit "join" (otherUserId)
  Scr->>IO: emit "focus-conversation" (conversationId) — unread → 0
  Scr->>IO: on "receive-message" → addMessage (for this peer)
  Note over Scr,Store: messagesByUser is keyed by the peer's id
```

> Threads were previously session-only (no history endpoint). A new
> `GET /api/messages/{conversationId}` endpoint + this load make past messages
> appear on both sides.

---

## 8. Conversation list (Chats tab)

```mermaid
flowchart TD
  Focus["ChatsScreen gains focus"] -->|"useFocusEffect"| Load["dispatch(loadConversations(user._id))"]
  Load -->|"GET /api/conversations/{userId}"| List[(conversations<br/>participants + lastMessage)]
  List --> Render["FlatList rows<br/>avatar · name · last message · unread"]
  Socket["socket: receive-message"] --> Upsert["dispatch(upsertConversation)"]
  Upsert --> Render
  Render -->|"tap row"| Chat["navigate('Chat', { conversationId, otherUser })"]
```

> **Avatar fix:** `profileImage` arrives relative (`/uploads/x.jpg`) from the
> conversation populate; `avatarUri()` now absolutizes it to
> `http://<host>:5001/uploads/x.jpg` (and passes through already-absolute / `file://`).

---

## 9. Voice / video call (permission-gated)

```mermaid
flowchart TD
  Tap["ChatScreen header: tap 📞 voice / 🎥 video"] --> Perm{Request permission}
  Perm -->|voice| P1["RECORD_AUDIO"]
  Perm -->|video| P2["CAMERA + RECORD_AUDIO"]
  P1 --> G{Granted?}
  P2 --> G
  G -->|"yes"| Go["navigate('Call', { otherUser, kind })"]
  G -->|"no"| Close["return — just close, no alert"]
  Go --> CS["CallScreen: avatar · name ·<br/>Ringing→timer · mute / camera / end"]
```

> Permissions are declared in `AndroidManifest.xml` (`RECORD_AUDIO`, `CAMERA`).
> The call itself is a **placeholder UI** — wiring `react-native-webrtc` with
> signaling over the existing Socket.IO server would make it a real call.

---

## 10. Backend `send-message` internals

```mermaid
flowchart TD
  Ev["SocketHandlers: on 'send-message'"] --> R["userId = client.get('userId')<br/>otherUserId, text = payload"]
  R --> F{"conversation exists?<br/>findByBothParticipants"}
  F -->|no| C["new Conversation(ArrayList[userId, otherUserId])<br/>isNew = true"]
  F -->|yes| U[use existing]
  C --> M
  U --> M["save Message(conversationId, senderId=userId, text)"]
  M --> Un["unreadCounts[otherUserId]++"]
  Un --> LM["conversation.lastMessage = message.id · save"]
  LM --> Pop["ConversationService.populate<br/>(participants + lastMessage)"]
  Pop --> Emit["emit 'receive-message' to room(otherUserId)<br/>{ message, conversation, isNew }"]
```

---

## REST & Socket reference

| REST (Axios → `:5001/api`) | Purpose |
|---|---|
| `GET /users/{phone}` | Prefill account setup (404 = new user) |
| `POST /users` (multipart) | Create user |
| `PUT /users/{id}` (multipart) | Update name / profile image |
| `GET /conversations/{userId}` | Conversation list (participants + lastMessage) |
| `GET /messages/{conversationId}` | Message history, oldest-first |

| Socket.IO (`:5002`) | Direction | Payload |
|---|---|---|
| connect (`auth:{userId}`) | client → server | auto-joins personal room |
| `join` | client → server | `otherUserId` |
| `send-message` | client → server | `{ otherUserId, text }` |
| `focus-conversation` | client → server | `conversationId` (unread → 0) |
| `receive-message` | server → client | `{ message, conversation, isNew }` |
