Java 17 + Spring Boot 3.3 + Socket.io API

# Project

Chat backend for the React Native Claude AI mobile chat app. A Java port of an
original Node/Express + Mongoose + Socket.IO server, re-platformed onto the same
infrastructure conventions as the `backend_erp` project (PostgreSQL + JPA + Flyway,
Gradle, Docker, env-driven `application.yml`). It exposes a REST API (users,
conversations) and a real-time Socket.IO server for messaging.

# Stack

- Java 17, Gradle (wrapper, Gradle 9.4.1)
- Spring Boot 3.3.5 (web, data-jpa, validation)
- PostgreSQL + Flyway (migrations in `src/main/resources/db/migration`)
- Socket.IO via `com.corundumstudio.socketio:netty-socketio` (2.0.14)
- Lombok
- Docker / docker-compose (Postgres + app)

# Layout

- `ChatApplication.java` — entry point (`@EnableJpaAuditing`)
- `model/` — JPA entities `User`, `Conversation`, `Message`, plus `AuditableEntity`
  (Long id serialized as `_id`, `created_at`/`updated_at` audit columns).
  Conversation participants/unreadCounts are `@ElementCollection` side tables.
- `repository/` — Spring Data JPA repositories
- `controller/` — `UserController`, `ConversationController`, `RootController`, `GlobalExceptionHandler`
- `service/` — `FileStorageService` (uploads), `ConversationService` (populate, read tx),
  `ChatService` (transactional socket write logic)
- `config/` — `WebConfig` (serves `/uploads/**`, CORS), `SocketIOConfig` (netty-socketio bean)
- `socket/` — `SocketHandlers` (Socket.IO events), `SendMessagePayload`
- `db/migration/V1__init_chat.sql` — schema (must match the entities; `ddl-auto: validate`)

# Run

Config is env-driven (see `.env.example`; copy to `.env`).
- Full stack: `docker compose up --build` (Postgres + app; REST on 5001, Socket.IO on 5002)
- Local app, Postgres in Docker: `docker compose up -d postgres` then `./gradlew bootRun`
- Build jar: `./gradlew clean bootJar` -> `build/libs/chat-backend-1.0.0.jar`

Key env vars: `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`, `SERVER_PORT` (5001),
`SOCKETIO_PORT` (5002), `UPLOAD_DIR`, `DB_HOST_PORT` (5433).

Postgres is published on host port **5433** (the ERP's Postgres owns 5432). The
container's internal port stays 5432, so the app↔db link inside the compose network
is unaffected; only local `bootRun` connections use 5433.

# Run with Docker

Prereq: Docker Desktop must be running (`docker version` shows a Server section).
On first use: `cp .env.example .env`.

```bash
# A) Full stack — Postgres + app, both in Docker
docker compose up --build           # foreground; Ctrl+C to stop
docker compose up --build -d        # detached (background)

# B) DB in Docker, app on host (fast dev loop)
docker compose up -d postgres       # just chat-postgres on host port 5433
./gradlew bootRun                   # app connects to localhost:5433 (Windows: gradlew.bat)

# Inspect / manage
docker compose ps                   # container status
docker compose logs -f app          # follow app logs
docker compose down                 # stop & remove containers (keeps data)
docker compose down -v              # also wipe DB + uploads volumes (fresh start)
```

Container/port map (chat stack is fully independent of the ERP stack):

| Container       | Image              | Host port | Use                         |
|-----------------|--------------------|-----------|-----------------------------|
| `chat-postgres` | postgres:16-alpine | **5433**  | chat DB (`chatapp`)         |
| chat app        | built from Dockerfile | 5001 / 5002 | REST / Socket.IO         |

Notes:
- `docker compose up` creates the `chatapp` database automatically (`POSTGRES_DB`) and
  Flyway creates the tables on app boot; restarts only apply *new* migrations (data is kept).
- Start/stop the DB alone: `docker start chat-postgres` / `docker stop chat-postgres`.
- DBeaver: connect to host `localhost`, port `5433`, database `chatapp`, user/pass
  `postgres`/`postgres`. Tick **"Show all databases"** or it only lists the connected DB.
- Smoke test: `curl http://localhost:5001/` → `Hello`.

# URLs (local defaults)

REST API — base `http://localhost:5001`
- `http://localhost:5001/`                          (GET — health, returns `Hello`)
- `http://localhost:5001/api/users/{phone}`         (GET)
- `http://localhost:5001/api/users`                 (POST, multipart)
- `http://localhost:5001/api/users/{id}`            (PUT, multipart)
- `http://localhost:5001/api/conversations/{userId}` (GET)
- `http://localhost:5001/uploads/{filename}`        (GET — static profile images)

Socket.IO — `http://localhost:5002` (default path `/socket.io/`; client connects here, not 5001)

Database (PostgreSQL) — `jdbc:postgresql://localhost:5433/chatapp` (user/pass `postgres`/`postgres`)

Replace `localhost` with the host IP and the ports with `SERVER_PORT` / `SOCKETIO_PORT` /
`DB_HOST_PORT` if overridden in `.env`.

# REST API

- `GET  /` -> "Hello"
- `GET  /api/users/{phone}` -> user with `profileImage` as an absolute URL (404 if missing)
- `POST /api/users` (multipart: `phone`, `name?`, `profileImage?`) -> 201 created (400 if phone exists)
- `PUT  /api/users/{id}` (multipart: `name?`, `profileImage?`) -> updated user (replaces old image)
- `GET  /api/conversations/{userId}` -> conversations (participants + lastMessage populated), newest first

# Socket.IO events

Endpoint: `http://<host>:5002` (default path `/socket.io/`). userId is read from the
handshake auth (`{ userId }`) or `?userId=` query param — must be numeric.

Connection lifecycle:
- `connect`    — server auto-joins the client to its personal room `"<userId>"`.
- `disconnect` — logged server-side; no payload.

Client → Server (events the server listens for):
| Event                | Payload                       | Effect                                                              |
|----------------------|-------------------------------|--------------------------------------------------------------------|
| `join`               | `otherUserId` (string)        | Joins the client to room `"<otherUserId>"` (open a chat).           |
| `send-message`       | `{ otherUserId, text }`       | Persists message, bumps recipient unread count, updates lastMessage, then emits `receive-message` to the recipient. |
| `focus-conversation` | `conversationId` (string)     | Resets the caller's unread count for that conversation to 0.        |

Server → Client (events the server emits):
| Event             | Sent to                          | Payload                          |
|-------------------|----------------------------------|----------------------------------|
| `receive-message` | recipient's room (sender excluded) | `{ message, conversation, isNew }` |

Where `message` is the saved Message, `conversation` is the populated conversation
(participants + lastMessage), and `isNew` is `true` when the conversation was just created.

For a beginner-friendly walkthrough with diagrams and a learning roadmap, see
[SOCKET_IO_GUIDE.md](SOCKET_IO_GUIDE.md).

# Notes / differences vs the original Node app

- IDs are PostgreSQL `BIGSERIAL` (numeric `Long`), not Mongo ObjectId strings, but JSON still
  exposes them as `_id` to keep the mobile client contract. Socket userIds must be numeric.
- netty-socketio cannot share Tomcat's HTTP port: REST on `SERVER_PORT` (5001),
  Socket.IO on `SOCKETIO_PORT` (5002). Point the mobile client's socket URL at 5002.
- Schema is owned by Flyway; entities are validated against it (`ddl-auto: validate`).
  When changing an entity, add a new `V__*.sql` migration to match.

# Troubleshooting

`Address already in use: bind` (e.g. on 5002) — another instance is already holding
the port. Only run one instance at a time; free the ports with:

```powershell
# stop whatever is listening on the chat ports (REST 5001, Socket.IO 5002)
Get-NetTCPConnection -LocalPort 5001 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Get-NetTCPConnection -LocalPort 5002 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

This kills only the process on the named port. The chat app uses **5001 / 5002 / 5433**;
the `backend_erp` project uses **8080 / 5432** — different ports, so these commands never
affect the ERP. (Don't change the number to `8080`, or you'd stop the ERP.)

