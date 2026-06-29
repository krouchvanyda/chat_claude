## STACK / CONSTRAINTS (do not deviate without asking me first)
- React Native 0.74.6, JavaScript (not TypeScript)
- Open-source dependencies only — no commercial SDKs or paid packages
- Navigation: React Navigation
- State management: Redux Toolkit
- HTTP client: Axios, wrapped in a single shared API client module

# Project

`ChatApp` — a WhatsApp-style React Native chat client (bare RN CLI, **not** Expo).
It is a JavaScript port of an original Expo Router + TypeScript + NativeWind app,
re-platformed onto the stack above and wired to the Java/Spring Boot + Socket.IO
backend documented in `BACKEND.md`.

Flow: Welcome → Login (phone) → OTP (client-generated demo code) → Account Setup
(create/update the user via the REST API) → Tabs (Chats / Updates / Communities /
Calls). The Chats tab lists real conversations from the backend; tapping one opens
a live chat screen backed by Socket.IO.

# Stack

- React Native 0.74.6, React 18.2, JavaScript (bare RN CLI project; has `android/` + `ios/`)
- Navigation: `@react-navigation/native` v6 + native-stack + bottom-tabs
- State: Redux Toolkit (`@reduxjs/toolkit`) + `react-redux`
- HTTP: Axios, via the single shared client `src/api/client.js`
- Realtime: `socket.io-client` (wrapped in `src/services/socket.js`)
- Styling: NativeWind v4 (Tailwind `className` on RN components) — pinned to
  `nativewind@4.1.23` (reanimated-3 compatible; see "Gotchas")
- Persistence: `@react-native-async-storage/async-storage`
- Images: `react-native-image-picker`
- Icons: `react-native-vector-icons`
- Required RN peers: `react-native-screens`, `react-native-safe-area-context`,
  `react-native-gesture-handler`, `react-native-reanimated@3.16.7`

## Project Architecture

```
mobile/                              # project root (app display name: ChatApp)
├── android/                         # native Android project (Gradle)
├── ios/                             # native iOS project (CocoaPods)
├── src/
│   ├── api/                         # REST layer — all calls via the shared Axios client
│   │   ├── client.js                # the single shared Axios instance (baseURL = API_URL)
│   │   ├── users.js                 # fetchUser / saveUser / updateUser (multipart)
│   │   └── conversations.js         # fetchConversations(userId)
│   ├── services/
│   │   └── socket.js                # Socket.IO wrapper (connect / join / send / receive)
│   ├── store/                       # Redux Toolkit — single source of truth
│   │   ├── index.js                 # configureStore({ auth, chat })
│   │   ├── authSlice.js             # persisted user: loadUserFromStorage / setUser / logout
│   │   └── chatSlice.js             # conversations + messagesByUser; loadConversations thunk
│   ├── navigation/
│   │   ├── RootNavigator.js         # native-stack: Welcome/Login/Otp/AccountSetup/Tabs/Chat
│   │   └── TabNavigator.js          # bottom-tabs: Chats/Updates/Communities/Calls
│   ├── screens/
│   │   ├── WelcomeScreen.js
│   │   ├── LoginScreen.js
│   │   ├── OtpScreen.js
│   │   ├── AccountSetupScreen.js
│   │   ├── ChatsScreen.js           # conversation list (REST + live socket updates)
│   │   ├── ChatScreen.js            # 1:1 realtime thread
│   │   ├── UpdatesScreen.js
│   │   ├── CommunitiesScreen.js
│   │   └── CallsScreen.js
│   ├── components/
│   │   └── CustomTextInput.js
│   ├── utils/
│   │   ├── storage.js               # AsyncStorage helpers (user persistence)
│   │   └── chat.js                  # participant / avatar / unread / time helpers
│   ├── assets/
│   │   └── images/
│   │       └── WhatsApp.png
│   └── config.js                    # HOST + derived API_URL (5001) / SOCKET_URL (5002)
├── App.js                           # Provider + NavigationContainer + gesture/safe-area roots
├── index.js                         # entry; imports react-native-gesture-handler first
├── global.css                       # Tailwind directives (NativeWind input)
├── tailwind.config.js               # NativeWind preset + content globs
├── babel.config.js                  # @react-native/babel-preset + nativewind/babel
├── metro.config.js                  # wrapped with nativewind/metro (input: ./global.css)
├── package.json
├── CLAUDE.md
└── BACKEND.md
```

Layered, with a one-way dependency direction (UI → state → data → transport).
A layer only imports from the layers below it; nothing imports back up.

```
 UI            screens/  +  components/  +  navigation/
                     │ dispatch(thunk/action)        │ useSelector(read)
                     ▼                                ▲
 State         store/  (Redux Toolkit: authSlice, chatSlice)
                     │ thunks call                    │ results land in state
                     ▼                                │
 Data          api/ (users, conversations)   services/socket.js
                     │ all REST via api/client.js     │ Socket.IO events
                     ▼                                ▼
 Transport     Axios  (HTTP 5001)            socket.io-client (WS 5002)
                     ▼
 Backend       Java / Spring Boot + Socket.IO  (see BACKEND.md)
```

**Layer responsibilities**
- **UI** — screens render from Redux via `useSelector` and trigger changes by
  dispatching thunks/actions. Screens hold only local/ephemeral UI state
  (form text, timers); nothing app-wide lives in component state.
- **State (single source of truth)** — `store/` is the only place app data lives.
  `authSlice` owns the logged-in `user` (mirrored to AsyncStorage); `chatSlice`
  owns `conversations` and `messagesByUser`.
- **Data** — `api/*` (thin REST functions over the shared Axios client) and
  `services/socket.js` (the only module that touches the socket). These are the
  sole boundaries to the backend; UI never calls Axios or the socket directly.
- **Transport** — Axios for request/response over HTTP; socket.io-client for the
  realtime, event-driven channel. The two run on separate ports (5001 / 5002).

**Unidirectional data flow** — `UI event → dispatch → thunk/action → (api or
socket) → state update → re-render`. Reads are always selectors; writes are
always dispatches. This keeps the chat list, unread counts, and message threads
consistent regardless of whether a change originated from a tap or an inbound
socket event.

**Startup & auth lifecycle** (`App.js`)
1. `loadUserFromStorage` runs once; `auth.bootstrapped` gates a splash spinner.
2. When a `user` exists, the socket connects (`connectSocket(user._id)`); it
   disconnects on logout / user change.
3. `RootNavigator` picks its initial route from `auth.user` (Tabs vs Welcome).

**Navigation graph** — a native-stack root with a nested bottom-tab navigator:
```
RootNavigator (native-stack)
├─ Welcome → Login → Otp → AccountSetup   (auth funnel)
├─ Tabs (bottom-tabs)                       (home)
│   ├─ Chats  ├─ Updates  ├─ Communities  ├─ Calls
└─ Chat                                     (1:1 conversation, pushed from Chats)
```

**Realtime messaging flow** — opening `ChatScreen` emits `join` + `focus-conversation`
and subscribes to `receive-message`. Sending emits `send-message` and optimistically
appends the message to `chat.messagesByUser`; inbound messages for the open peer are
appended the same way. `ChatsScreen` separately listens for `receive-message` to
re-order/refresh the conversation list. Because the backend has no message-history
REST endpoint, threads are session-scoped (live messages only).

# Backend integration (see BACKEND.md)

Set the backend host in `src/config.js` (`HOST`). It derives:
- `API_URL`    = `http://<HOST>:5001/api`  (REST)
- `SOCKET_URL` = `http://<HOST>:5002`      (Socket.IO)

Host values per target:
- Android emulator → `10.0.2.2`
- iOS simulator → `localhost`
- Physical device → your computer's LAN IP (same Wi-Fi)

REST (Axios, all through `src/api/client.js`):
- `GET  /api/users/{phone}`            — prefill account setup (404 = new user)
- `POST /api/users` (multipart)        — create user
- `PUT  /api/users/{id}` (multipart)   — update user (name/profileImage)
- `GET  /api/conversations/{userId}`   — conversations list (participants + lastMessage)

User JSON uses `_id` and an absolute `profileImage` URL; socket `userId` must be numeric.

Socket.IO (`src/services/socket.js`):
- connect with `auth: { userId }` (numeric) → server auto-joins the personal room
- emit `join` (otherUserId), `send-message` ({otherUserId, text}), `focus-conversation` (conversationId)
- listen `receive-message` → `{ message, conversation, isNew }`

Note: the backend exposes no REST message-history endpoint, so a chat thread starts
empty and accumulates sent + received messages live for the session (kept in
`chat.messagesByUser`, keyed by the peer's id).

# Run

Prereqs: Node ≥ 18, JDK 17, Android SDK (+ emulator or device). The chat backend
must be running and reachable at the `HOST` set in `src/config.js`.

```bash
npm install
npm start                 # Metro bundler
npm run android           # build + launch on emulator/device
# iOS (macOS only): cd ios && pod install && cd .. && npm run ios
```

Reset Metro cache after changing babel/metro/tailwind config:
`npx react-native start --reset-cache`.

# Conventions

- JavaScript only — no `.ts`/`.tsx`, no type annotations.
- All REST calls go through `src/api/client.js` (never call axios directly elsewhere).
- All socket interaction goes through `src/services/socket.js`.
- Styling via NativeWind `className`; `className` works on RN core components out of
  the box. Add new source paths to `tailwind.config.js` `content` if you create dirs
  outside `src/`.
- Server-shaped objects keep backend field names (`_id`, `profileImage`, `lastMessage`).

# Gotchas (learned during the conversion)

- **NativeWind is pinned to 4.1.23.** 4.2.x's babel preset unconditionally requires
  `react-native-worklets/plugin` (a reanimated-4 package). With reanimated 3 that
  module doesn't exist and Metro fails to transform. 4.1.23's preset uses
  `react-native-reanimated/plugin` instead — keep it paired with reanimated 3.16.7.
- **react-native-reanimated is pinned to 3.16.7** — the last 3.x with a self-contained
  babel plugin (3.17+ split worklets into a separate package).
- **The native modules are pinned to exact RN-0.74-era versions** (no `^`):
  `react-native-screens@3.31.1`, `react-native-safe-area-context@4.10.5`,
  `react-native-gesture-handler@2.16.2`, `react-native-image-picker@7.1.2`,
  `react-native-vector-icons@10.1.0`, `@react-native-async-storage/async-storage@1.24.0`.
  Newer releases (e.g. screens 3.37, gesture-handler 2.32) transitively require
  `androidx.core:1.16.0`, which needs **compileSdk 35 + AGP 8.6.0+**; the RN 0.74.6
  template uses compileSdk 34 + AGP 8.2.1, so the build fails at
  `:app:checkDebugAarMetadata`. Keep these pinned unless you also bump the Android
  toolchain (compileSdk/targetSdk 35, AGP 8.6.0, Gradle 8.7+).
- Do **not** add `react-native-reanimated/plugin` to `babel.config.js`; `nativewind/babel`
  already appends it (adding it again duplicates the plugin).
- Android allows cleartext HTTP in debug builds (`android/app/src/debug/AndroidManifest.xml`)
  so the `http://` dev backend works. A release build needs HTTPS or an explicit
  network-security config.
- Vector-icon fonts are bundled on Android via the `fonts.gradle` apply at the bottom
  of `android/app/build.gradle`. On iOS, add the font filenames to `ios/.../Info.plist`
  `UIAppFonts` and run `pod install`.
- **The project path MUST be space-free — this copy lives at `D:\ReactNative\ChatApp`.**
  React Native's C++ (CMake/ninja) builds mangle spaced paths, so reanimated/screens
  fail with `ninja: error: mkdir(...)` if any parent folder has a space (the original
  was at `D:\React Native\...\Chat Project\mobile` — note the spaces in "React Native"
  and "Chat Project"). Do **not** move this project back under a path containing spaces,
  and do **not** use a junction as a shortcut (Metro resolves the junction back to the
  real path and then NativeWind misreads `global.css`, parsing `@tailwind` as a JS
  decorator). Keep it at `D:\ReactNative\ChatApp` (or any space-free path) and run both
  Metro and Gradle from there. After any path change, delete stale
  `node_modules/**/.cxx` and `android/**/.cxx` (they cache the old absolute path).
- **Gradle project cache is forced outside the project tree** (`--project-cache-dir
  C:/gradle-cache/chatapp`, baked into the `android` / `android:clean` npm scripts).
  Building with the default in-tree `android/.gradle` fails deterministically on this
  Windows machine with *"Could not move temporary workspace … to immutable location"*
  (Gradle marks the moved cache dir read-only and the rename is blocked — likely
  Defender/indexer scanning the long, space-containing project path). An external
  cache on `C:` avoids it. Always build via `npm run android` (not a bare
  `gradlew`/`run-android`) so the flag is applied; if you must call gradle directly,
  pass `--project-cache-dir C:/gradle-cache/chatapp` yourself.
