# PadelPoint API

REST + WebSocket API for managing padel classes. Built with AdonisJS v6, PostgreSQL, and Socket.IO.

## Stack

- **Framework**: AdonisJS v6
- **Database**: PostgreSQL (Neon for dev, Docker for tests)
- **Auth**: JWT (custom guard with `jose`)
- **Realtime**: Socket.IO
- **Validation**: VineJS
- **ORM**: Lucid

---

## Prerequisites

- Node.js 20+
- Docker (for running tests)
- A PostgreSQL database (Neon or local)

---

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```env
TZ=UTC
PORT=3333
HOST=localhost
NODE_ENV=development
LOG_LEVEL=info

APP_KEY=<generate with: node ace generate:key>
APP_URL=http://localhost:3333
SESSION_DRIVER=cookie

JWT_SECRET=<any long random string>

DB_HOST=<neon host>
DB_PORT=5432
DB_USER=<user>
DB_PASSWORD=<password>
DB_DATABASE=<database>
DB_SSL=true
```

Run migrations:

```bash
node ace migration:run
```

Start the dev server:

```bash
npm run dev
```

---

## Running Tests

Tests use a local Docker PostgreSQL instance on port 5433.

```bash
# Start the test database
npm run test:db:up

# Run all tests
npm test

# Stop the test database
npm run test:db:down
```

Tests are in `tests/functional/` (HTTP) and `tests/unit/` (service logic).

---

## API Reference

Base URL: `http://localhost:3333/api/v1`

All protected routes require: `Authorization: Bearer <jwt>`

---

### Auth

#### `POST /api/v1/auth/signup`

Create a new account.

```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean@example.com",
  "password": "secret123",
  "role": "player"
}
```

`role` is `"player"` or `"teacher"`.

---

#### `POST /api/v1/auth/login`

```json
{
  "email": "jean@example.com",
  "password": "secret123"
}
```

Returns `{ "token": "eyJ..." }`.

---

#### `POST /api/v1/account/logout` 🔒

Invalidates the current session.

---

#### `GET /api/v1/account/profile` 🔒

Returns the authenticated user's profile.

---

### Classes

#### `GET /api/v1/classes` 🔒

List classes. Teachers see their own classes. Players see published classes.

**Query params (all optional):**

| Param | Type | Description |
|---|---|---|
| `date` | `YYYY-MM-DD` | Filter by scheduled date |
| `level` | `1–10` | Classes where this level fits the range (or no range set) |
| `location` | string | Case-insensitive partial match |
| `available` | boolean | Only classes with remaining spots |

---

#### `GET /api/v1/classes/:id` 🔒

Get a single class. Players can only see published classes.

---

#### `POST /api/v1/classes` 🔒 👨‍🏫 Teacher only

Create one or more classes in a single request.

```json
{
  "classes": [
    {
      "name": "Cours débutant",
      "scheduledAt": "2026-07-07T09:00:00.000Z",
      "duration": 60,
      "location": "Court 1",
      "levelMin": 1,
      "levelMax": 4,
      "club": "Padel Club Paris",
      "maxPlayers": 4
    }
  ]
}
```

`levelMin`/`levelMax` are optional (1–10, decimals allowed e.g. `5.5`). `maxPlayers` max is 4. Returns the created classes.

---

#### `PUT /api/v1/classes/:id` 🔒 👨‍🏫 Teacher only

Update a class. All fields optional.

```json
{
  "name": "Nouveau nom",
  "scheduledAt": "2026-07-10T10:00:00.000Z",
  "duration": 90,
  "location": "Court 2",
  "levelMin": 5,
  "levelMax": 7,
  "club": "Club Nord",
  "maxPlayers": 4,
  "isPublished": true
}
```

> Setting `isPublished: false` is blocked if players are already enrolled.

---

#### `DELETE /api/v1/classes/:id` 🔒 👨‍🏫 Teacher only

Delete a class. Only allowed if `isPublished: false`.

---

#### `POST /api/v1/classes/:id/cancel` 🔒 👨‍🏫 Teacher only

Cancel a published class (even with enrolled players). Sets `isCancelled: true`.

---

#### `DELETE /api/v1/classes/:id/cancel` 🔒 👨‍🏫 Teacher only

Reverse a cancellation. Only allowed while the class has not yet ended (`scheduledAt + duration > now`).

---

#### `POST /api/v1/classes/:id/join` 🔒

Player joins a class. Checks:
- User is a player
- Class is published and not cancelled
- Class has not yet started
- Class is not full
- Player level is within `levelMin`/`levelMax` range (if set)
- Player is not already enrolled

---

#### `DELETE /api/v1/classes/:id/join` 🔒

Player leaves a class. Checks:
- User is a player
- Class has not yet started

---

#### `GET /api/v1/classes/:id/players` 🔒

List enrolled players. Teachers (owner) also receive `email`. Other users only see `firstName`, `lastName`, `level`, `joinedAt`.

---

#### `GET /api/v1/classes/:id/messages` 🔒

Chat history for a class.

**Query params:**

| Param | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `limit` | `50` | Messages per page (max 100) |

Messages are ordered oldest first.

---

## WebSocket (Socket.IO)

Connect to `http://localhost:3333` with your JWT token:

```js
const socket = io('http://localhost:3333', {
  auth: { token: 'Bearer <jwt>' },
  transports: ['websocket'],
})
```

### Events — Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_class` | `classId: string` | Join a class room (required before sending messages) |
| `send_message` | `{ classId: string, content: string }` | Send a message (max 1000 chars) |
| `leave_class` | `classId: string` | Leave a class room |

### Events — Server → Client

| Event | Payload | Description |
|---|---|---|
| `joined` | `{ classId }` | Confirmation after joining a room |
| `new_message` | `{ id, classId, content, createdAt, author: { id, firstName, lastName, role } }` | New message broadcast to all room members |
| `error` | `{ message }` | Error from any event handler |

### Test page

Open `public/socket-test.html` directly in your browser (no server needed):

```bash
open public/socket-test.html
```

---

## Business Rules Summary

| Rule | Details |
|---|---|
| Class max players | 4 |
| Level range | 1–10, decimals allowed (e.g. `5.5`) |
| Delete class | Only if `isPublished: false` |
| Unpublish class | Only if 0 enrolled players |
| Cancel class | Only if `isPublished: true` (players enrolled OK) |
| Uncancel class | Only while `scheduledAt + duration > now` |
| Join class | Published, not started, not full, level in range |
| Leave class | Class must not have started yet |

---

## Project Structure

```
app/
  controllers/     # HTTP handlers
  guards/          # JWT auth guard
  middleware/      # auth, requireTeacher
  models/          # Lucid ORM models
  services/        # Business logic (ClassService)
  validators/      # VineJS schemas
database/
  migrations/      # PostgreSQL migrations
  factories/       # Test data factories
providers/
  api_provider.ts  # Response serializer
  socket_provider.ts # Socket.IO setup
start/
  routes.ts        # All HTTP routes
tests/
  functional/      # HTTP integration tests
  unit/            # Service unit tests
public/
  socket-test.html # WebSocket test page
```
