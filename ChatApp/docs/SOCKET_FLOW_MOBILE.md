# Mobile — Socket.IO Flow (config → connect → send → receive)

How the **React Native app** uses Socket.IO end to end: where it's configured, when
it connects, how a message is sent, and how an incoming message reaches the UI.

> Scope: the **mobile client** only. The Java backend is referenced where relevant
> but documented separately (see `CHAT_FLOW.md` / `ARCHITECTURE_ASCII.md`).

---

## At a glance

```
 ┌──────────────┐  ┌──────────────────────┐  ┌──────────────┐  ┌───────────────────┐
 │  config.js   │─▶│  services/socket.js  │◀─│    App.js    │  │     ChatScreen    │
 │  SOCKET_URL  │  │  connect · emit · on │  │ connectSocket│  │  handleSend ─▶ emit│
 └──────────────┘  └──────────┬───────────┘  └──────────────┘  └───────────────────┘
                              │                                          ▲
                  ┌───────────┴─────────────┐                           │ on "receive-message"
                  │ ChatsScreen / ChatScreen │───────────────────────────┘
                  │  onReceiveMessage(...)   │
                  └──────────────────────────┘
```

All socket access goes through the single wrapper `services/socket.js` — screens never
touch `socket.io-client` directly (project convention).

---

## 1. Config — where the socket points

`src/config.js`
```js
// Physical Android device: your computer's LAN IP (same Wi-Fi).
const HOST = '172.20.17.31';
export const API_URL    = `http://${HOST}:5001/api`; // REST
export const SOCKET_URL = `http://${HOST}:5002`;     // Socket.IO (separate port)
```
- REST (`5001`) and Socket.IO (`5002`) are **different ports** — netty-socketio can't
  share Tomcat's HTTP port.
- `HOST` per target: Android emulator `10.0.2.2`, iOS simulator `localhost`,
  physical device → the PC's LAN IP.

---

## 2. The socket wrapper — `src/services/socket.js`

The only module that imports `socket.io-client`. It owns one connection and a set of
subscribers.

### 2.1 Module state
```js
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

let socket = null;                  // the single connection (or null)
const receiveHandlers = new Set();  // "receive-message" subscribers
```
Subscribers are kept in a **Set that is independent of the socket**. This is what lets
a screen subscribe *before* the socket has connected (see §5, the race we fixed).

### 2.2 Connect
```js
const fanOutReceiveMessage = payload =>
  receiveHandlers.forEach(h => h(payload)); // deliver to every subscriber

export const connectSocket = userId => {
  if (socket && socket.connected) return socket;   // idempotent — reuse if open
  const numericId = Number(userId);                // backend requires a numeric id

  socket = io(SOCKET_URL, {
    transports: ['websocket'],   // skip HTTP long-poll, go straight to WS
    auth:  { userId: numericId },// handshake auth  ─┐ server reads either of
    query: { userId: numericId },// query fallback  ─┘ these to identify the user
    forceNew: true,
  });

  socket.on('connect',        () => console.log('Socket connected', socket.id));
  socket.on('disconnect',     r  => console.log('Socket disconnected', r));
  socket.on('connect_error',  e  => console.log('Socket connect_error', e?.message));
  socket.on('receive-message', fanOutReceiveMessage); // ONE real listener, fans out
  return socket;
};
```

### 2.3 Emitters (client → server)
```js
export const joinChat = otherUserId =>
  socket?.emit('join', String(otherUserId));            // open a peer's room

export const sendMessage = (otherUserId, text) =>
  socket?.emit('send-message', { otherUserId, text });  // send a message

export const focusConversation = conversationId =>
  socket?.emit('focus-conversation', String(conversationId)); // reset my unread → 0
```
> Note the `socket?.` — if the socket isn't connected yet, the emit is a **no-op**.
> (That's why an unreachable backend looks like "message shows locally but nobody gets it".)

### 2.4 Subscribe / disconnect
```js
export const onReceiveMessage = handler => {
  receiveHandlers.add(handler);                 // subscribe (works even pre-connect)
  return () => receiveHandlers.delete(handler); // unsubscribe — call on unmount
};

export const disconnectSocket = () => {
  if (socket) { socket.removeAllListeners(); socket.disconnect(); socket = null; }
};
```

---

## 3. When the socket connects — `App.js`

The connection is tied to the **logged-in user**, opened once the user is known and
closed on logout / user change:
```js
useEffect(() => {
  if (user?._id) connectSocket(user._id);
  return () => disconnectSocket();
}, [user?._id]);
```
Lifecycle: `loadUserFromStorage` → `user` set → `connectSocket(user._id)` → on the
backend the user auto-joins their **personal room** (named after their id).

---

## 4. Sending a message — `src/screens/ChatScreen.js`

```js
const handleSend = () => {
  const trimmed = text.trim();
  if (!trimmed || !otherUserId) return;

  sendMessage(otherUserId, trimmed);     // 1) emit "send-message" to the server

  dispatch(addMessage({                  // 2) optimistic: render my bubble now
    otherUserId,
    message: {
      _id: `local-${messages.length}-${trimmed.length}`,
      text: trimmed,
      sender: currentUser?._id,
      createdAt: new Date().toISOString(),
    },
  }));
  setText('');
};
```
Two things happen independently:
1. the event leaves for the server, and
2. the message is shown **immediately** in my own thread (we don't wait for a round-trip).

The server persists it and pushes `receive-message` to the *recipient* only (the sender
is excluded), so I never receive an echo of my own message — hence the optimistic add.

---

## 5. Receiving a message — subscribers

When the socket fires `receive-message`, `fanOutReceiveMessage` (§2.2) calls every
subscriber. Two screens subscribe:

### 5.1 Conversation list — `src/screens/ChatsScreen.js`
```js
useEffect(() => {
  const unsubscribe = onReceiveMessage(({ conversation }) => {
    if (conversation) dispatch(upsertConversation(conversation)); // bump to top, update preview/unread
  });
  return unsubscribe; // clean up on unmount
}, [dispatch]);
```

### 5.2 Open thread — `src/screens/ChatScreen.js`
```js
const unsubscribe = onReceiveMessage(({ message }) => {
  // only append if the message belongs to the peer this screen is showing
  if (String(senderId(message)) === String(otherUserId)) {
    dispatch(addMessage({ otherUserId, message }));
  }
});
return unsubscribe;
```
```js
// messages carry `senderId` (from the backend) or `sender` (optimistic local) — accept either
const senderId = m => {
  const s = m?.sender ?? m?.senderId;
  return s && typeof s === 'object' ? s._id : s;
};
```

> **Why the Set in §2.1 matters:** `ChatsScreen` mounts (and subscribes) *before*
> `App.js` runs `connectSocket`. If `onReceiveMessage` attached directly to `socket`,
> it would attach to `null` and silently never fire. Storing handlers in a Set and
> attaching one real `socket.on('receive-message')` at connect time fixes that — every
> subscriber gets events regardless of timing.

---

## 6. Opening a chat also drives the socket — `ChatScreen`

On mount (existing conversation), the screen joins the peer's room, clears its unread,
and subscribes:
```js
useEffect(() => {
  if (!otherUserId) return;
  joinChat(otherUserId);                       // emit "join"
  if (conversationId) focusConversation(conversationId); // emit "focus-conversation"
  const unsubscribe = onReceiveMessage(/* §5.2 */);
  return unsubscribe;
}, [conversationId, dispatch, otherUserId]);
```
(History itself comes over **REST** — `GET /api/messages/{conversationId}` — not the socket.)

---

## 7. Full path (mobile), config → send → receive

```
 config.js SOCKET_URL
   │
   ▼
 App.js  ──connectSocket(user._id)──▶  services/socket.js
                                          io(SOCKET_URL, { auth:{userId}, query:{userId} })
                                          socket.on('receive-message', fanOut)
   ChatScreen.handleSend
     │  sendMessage(otherUserId, text)  ──emit "send-message"──▶  (backend persists +
     │  dispatch(addMessage)  ── optimistic bubble                 emits "receive-message"
     │                                                             to the recipient only)
     ▼
 recipient device:
   socket "receive-message"  ─▶  fanOutReceiveMessage  ─▶  receiveHandlers:
                                     ├─ ChatsScreen → upsertConversation  (list)
                                     └─ ChatScreen  → addMessage          (open thread)
```

---

## 8. File / function reference

| File | Exports / use |
|------|---------------|
| `src/config.js` | `SOCKET_URL` |
| `src/services/socket.js` | `connectSocket`, `disconnectSocket`, `joinChat`, `sendMessage`, `focusConversation`, `onReceiveMessage`, `getSocket` |
| `App.js` | calls `connectSocket` / `disconnectSocket` on user change |
| `src/screens/ChatScreen.js` | `joinChat` + `focusConversation` + `onReceiveMessage` on open; `sendMessage` + optimistic `addMessage` on send |
| `src/screens/ChatsScreen.js` | `onReceiveMessage` → `upsertConversation` |
| `src/store/chatSlice.js` | `addMessage`, `setMessages`, `upsertConversation` reducers |

## Events the mobile app uses

| Event | Direction | Payload | Sent / handled in |
|-------|-----------|---------|-------------------|
| connect (`auth:{userId}`) | client → server | numeric `userId` | `connectSocket` |
| `join` | client → server | `otherUserId` | `joinChat` (ChatScreen) |
| `send-message` | client → server | `{ otherUserId, text }` | `sendMessage` (ChatScreen) |
| `focus-conversation` | client → server | `conversationId` | `focusConversation` (ChatScreen) |
| `receive-message` | server → client | `{ message, conversation, isNew }` | `onReceiveMessage` (Chats/ChatScreen) |

## Gotchas

- **Numeric userId** — `connectSocket` does `Number(userId)`; the backend rejects
  non-numeric ids. A `NaN` here serializes to `null` and the server can't identify you.
- **Emit before connect = silent no-op** — `socket?.emit(...)`. If the device can't
  reach `SOCKET_URL` (wrong `HOST`, different Wi-Fi, airplane mode, firewall on 5002),
  the message appears locally (optimistic) but never persists or arrives.
- **Full reload after editing `socket.js`** — the module holds the live connection as
  state; Fast Refresh won't re-run `connectSocket`. Press `r` in Metro.
- **No self-echo** — the server excludes the sender from `receive-message`; the sender
  relies on the optimistic `addMessage` and, on reopen, REST history.
