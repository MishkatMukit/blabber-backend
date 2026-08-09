# Blabber API Migration Guide

This document maps every endpoint from the **legacy Express + MongoDB** backend (see `legacy.md`) to the **new Express + TypeScript + Prisma (PostgreSQL)** backend, and lists everything the legacy frontend must change to run against the new API.

**Base URL:** `http://localhost:5000` (configurable via `PORT` in `.env`)

---

## 1. Top-Level Changes (read this first)

### 1.1 URL prefix
- Legacy endpoints had **no** prefix (e.g. `/blabs`).
- New endpoints are mounted under **`/api`**: `/api/blabs`, `/api/auth`, `/api/echo`.

### 1.2 Authentication
- Legacy: **Firebase** ID tokens sent as `Authorization: Bearer <firebaseToken>` and verified with `admin.auth().verifyIdToken(token)`. Users were keyed by `fb_uid`, and the token's `uid` was used as the author.
- New: **JWT** issued by this server (email + password). Users are keyed by a DB `id`, and authorship uses the linked `profile.id`.

### 1.3 ID types and field names
- Legacy IDs were **MongoDB `ObjectId`** strings (24 hex chars, e.g. `64f...`). Frontend checks like `id.length === 24` will break.
- New IDs are **Prisma CUIDs** (`c...`) for blabs/echoes/profiles/conversations and **UUIDs** for users. Treat IDs as opaque strings.
- Field renames that break serialized data:

| Legacy field | New field | Notes |
|---|---|---|
| `authorId` (was `fb_uid`) | `author.id` (profile id) | Author is now an embedded object `{ id, userName, photo }` |
| `authorUsername` / `authorUserName` | `author.userName` | Embedded under `author` |
| `applause` (array of uids) | `_count.applause` | See §7 |
| `applauseCount` | `_count.applause` | See §7 |
| `echoesCount` | `_count.echoes` | On blabs (when included) |
| `_id` | `id` | Everywhere |

### 1.4 Response envelope
- Legacy: routes returned **raw** documents (`res.send(result)`) or `{ data, totalPages }`.
- New: **every** success response is wrapped by `sendResponse`:

```jsonc
{
  "success": true,
  "statusCode": 200,
  "message": "Blabs fetched successfully",
  "data": { /* payload */ },
  "meta": { "page": 1, "limit": 5, "total": 42, "totalPages": 9 } // only on paginated lists
}
```

- Errors go through the global error handler:

```jsonc
{
  "success": false,
  "statusCode": 401,
  "name": "Error",
  "message": "You are not logged in. Please login to access resources.",
  "errorDetails": "stack trace"
}
```

Common error codes:

| Situation | Status |
|---|---|
| Not logged in / invalid token | 401 |
| Validation failed (`validateRequest`) | **500** (note: currently returns 500, not 400) |
| Duplicate key / FK violation | 400 |
| `findUniqueOrThrow` miss (blab/echo/user not found) | 404 (`P2025`) |
| Owner-only operation on someone else's resource | 500 (thrown `Error`) |

---

## 2. Auth — new endpoints the frontend must adopt

Legacy relied on Firebase sign-in + token. The new API has its own JWT auth:

### `POST /api/auth/register`
Body: `{ "name": string (≥2), "email": string, "password": string (≥6), "profilePhoto"?: string }`
Response `201`:

```jsonc
{
  "success": true, "statusCode": 201, "message": "User registered successfully",
  "data": {
    "user": { "id": "uuid", "email": "...", "role": "USER",
      "profile": { "id": "cuid", "userName": "...", "photo": "" } },
    "accessToken": "jwt", "refreshToken": "jwt"
  }
}
```

### `POST /api/auth/login`
Body: `{ "email": string, "password": string }`
Response `200`: same shape as register (`user`, `accessToken`, `refreshToken`). On bad credentials: `401`-style error `"Invalid email or password"`.

### `POST /api/auth/refresh-token`
Body: `{ "refreshToken": "jwt" }` — returns fresh `{ accessToken, refreshToken }` in `data`. Use this when the access token expires (401 from a protected route).

### `POST /api/auth/logout`
Body: `{ "refreshToken": "jwt" }`. Tokens are stateless — this just clears the auth cookies.

### `GET /api/auth/profile`
Requires auth. Returns the current user with full profile:

```jsonc
"data": {
  "id": "uuid", "email": "...", "role": "USER", "createdAt": "ISO date",
  "profile": { "id": "cuid", "userName": "...", "bio": "...", "photo": "...", "blabsCount": 0 }
}
```

### Sending the token
The `auth` middleware accepts the token from (in order):
1. Cookie `accessToken` (set automatically by register/login/refresh — `httpOnly`, so JS can't read it, but it's sent automatically with `credentials: "include"`).
2. `Authorization: Bearer <accessToken>` header.

**Frontend action:** switch from Firebase token to the JWT returned in `data.accessToken`. The `auth()` middleware also loads the user from the DB — so you no longer need a separate `GET /users/:fb_uid` lookup to resolve identity.

---

## 3. Blab endpoints

| # | Legacy | New | Auth | Body | Notes |
|---|---|---|---|---|---|
| 1 | `GET /blabs` | `GET /api/blabs` | No | — | Same `page`/`limit` query params. Response is now the envelope; pagination meta moved to `meta`. |
| 2 | `PATCH /blabs/applause/:id` | `POST /api/blabs/:id/applause` | Yes | — | Toggle applause; no body. |
| 3 | `GET /blabdetails/:id` | `GET /api/blabs/:id` | No (was Yes) | — | `blabdetails` → `blabs`; now public. |
| 4 | `GET /blabs/:id` (by author) | `GET /api/blabs?authorId=<profileId>` (not implemented) | — | — | **Not implemented.** No by-author filter exists yet. See §8. |
| 5 | `POST /blabs` | `POST /api/blabs` | Yes | `{ "content": string }` | Author comes from the token, **not** the body. `authorId`/`authorUsername` body fields are ignored. |
| 6 | `DELETE /blabs/delete/:id` | `DELETE /api/blabs/:id` | Yes | — | Route renamed `delete` → `DELETE` method. |
| 7 | `PATCH /editedBlab/:id` | `PATCH /api/blabs/:id` | Yes | `{ "content": string }` | Owner-only. |

**`GET /api/blabs` response shape:**

```jsonc
"data": [
  {
    "id": "cuid",
    "authorId": "profile-cuid",
    "content": "...",
    "createdAt": "2026-08-08T...Z",
    "author": { "id": "profile-cuid", "userName": "handle", "photo": "url-or-empty" },
    "_count": { "echoes": 2, "applause": 5 }
  }
],
"meta": { "page": 1, "limit": 5, "total": 42, "totalPages": 9 }
```

**`GET /api/blabs/:id`** additionally embeds `echoes` (each with `author` + `_count.applause`).

---

## 4. Echo endpoints

| # | Legacy | New | Auth | Body | Notes |
|---|---|---|---|---|---|
| 8 | `GET /blab/echoes/:id` | `GET /api/echo/blab/:blabId` | No (was Yes) | — | Prefix `/api/echo`; path param renamed to `blabId`. |
| 9 | `POST /blabs/echoes` | `POST /api/echo` | Yes | `{ "blabId": string, "content": string }` | `authorId`/`authorUsername` come from the token. |
| 10 | `PATCH /editedEcho/:id` | `PATCH /api/echo/:id` | Yes | `{ "content": string }` | Owner-only. |
| 11 | `PATCH /echoe/applause/:id` | `POST /api/echo/:id/applause` | Yes | — | Toggle; no body. |
| 12 | `DELETE /deleteEcho/:id` | `DELETE /api/echo/:id` | Yes | — | — |

**`GET /api/echo/blab/:blabId` response** — plain array (no meta):

```jsonc
"data": [
  {
    "id": "cuid", "blabId": "cuid", "authorId": "profile-cuid", "content": "...",
    "createdAt": "ISO date",
    "author": { "id": "profile-cuid", "userName": "handle", "photo": "url" },
    "_count": { "applause": 3 }
  }
]
```

**Note:** creating an echo increments the parent blab's `echoesCount`; deleting an echo decrements it. The `_count.echoes` you get back from blab reads reflects this.

---

## 5. User/profile endpoints

| # | Legacy | New | Auth | Body | Notes |
|---|---|---|---|---|---|
| 13 | `PATCH /users/updateBio/:id` | **Not implemented** | — | — | No bio-update endpoint yet. See §8. |
| 14 | `GET /users/:id` | **Not implemented** | — | — | No public user lookup yet. |
| 15 | `POST /users` (firebase) | `POST /api/auth/register` | No | `{ name, email, password, profilePhoto? }` | Replaces Firebase user creation. |
| 16 | — | `GET /api/auth/profile` | Yes | — | New — current user + profile. |

---

## 6. Chat endpoints (conversations + messages)

**Not implemented in the new API yet.** The schema exists (`Conversation`, `ConversationParticipant`, `Message`, `MessageRead` in `prisma/schema/`), but no routes/controllers/services exist for them, and there is **no Socket.IO** setup. Legacy endpoints:

- `GET /conversations`
- `POST /conversations` (`{ recipientId }`)
- `GET /conversations/:id/messages?page&limit`
- Socket.IO events: `join:conversations`, `message:send`, `typing:start`, `typing:stop`, `message:read`, `message:new`

**Frontend action:** keep the current chat client code on the legacy backend, or wait for the chat module to be ported. See §8.

---

## 7. Applause — data model change

Legacy stored `applause: string[]` (user ids) and `applauseCount: number` directly on the document. The new schema uses **join tables** (`BlabApplause`, `EchoApplause`), and reads return only `_count.applause`.

To render "did *I* applaud this?", the frontend needs the count plus whether the current user is in it. The toggle endpoints return `{ applauded: true|false }`, so the frontend should track it in state (optimistic toggle) rather than reading an array. **If you need the per-user list back, that's a missing feature — see §8.**

---

## 8. Gaps in the new API (frontend impact)

These legacy capabilities have **no equivalent endpoint yet** and will need to be added to the backend:

1. **Blabs by author** — legacy `GET /blabs/:id` (author's blabs). Add a query filter, e.g. `GET /api/blabs?authorId=<profileId>`.
2. **User profile lookup** — legacy `GET /users/:id`, `PATCH /users/updateBio/:id`. Needs a users module or auth-module additions.
3. **Chat** — all conversation/message REST + Socket.IO events (schema exists, no implementation).
4. **"Did I applaud?"** — legacy could check `applause.includes(myUid)`. The new API only exposes counts and the toggle result.
5. **Legacy data migration** — MongoDB documents must be migrated to PostgreSQL: `_id`→`id`, `fb_uid`→`User`/`Profile`, `applause` arrays→join tables, `echoesCount`/`applauseCount`→`_count`.

---

## 9. Suggested frontend changes (summary)

1. **API client**: add `/api` base path; point at `http://localhost:5000`.
2. **Auth**: replace Firebase sign-in/sign-up with `POST /api/auth/register` and `POST /api/auth/login`; store the returned JWT; send `Authorization: Bearer <accessToken>` (or rely on cookies with `credentials: "include"`); handle 401s by calling `POST /api/auth/refresh-token` (send the refresh token) and retrying; use `GET /api/auth/profile` for the current user.
3. **Response parsing**: unwrap `data` (and `meta`) from every response instead of using the raw body.
4. **ID checks**: stop assuming 24-char Mongo IDs.
5. **Blabs**: `POST /api/blabs` body is now just `{ content }` (no `authorId`/`authorUsername`); delete via `DELETE /api/blabs/:id` (was `/blabs/delete/:id`); edit via `PATCH /api/blabs/:id` (was `/editedBlab/:id`); details via `GET /api/blabs/:id` (was `/blabdetails/:id`); applause via `POST /api/blabs/:id/applause` (was `PATCH /blabs/applause/:id`).
6. **Echoes**: list via `GET /api/echo/blab/:blabId` (was `/blab/echoes/:id`); create via `POST /api/echo` with `{ blabId, content }`; edit via `PATCH /api/echo/:id`; delete via `DELETE /api/echo/:id`; applause via `POST /api/echo/:id/applause`.
7. **Author display**: use `blab.author.userName` / `echo.author.userName` and `author.photo` instead of top-level `authorUsername`/`authorUserName`.
8. **Counts**: use `blab._count.echoes` / `blab._count.applause` / `echo._count.applause` instead of `echoesCount`/`applauseCount`.
9. **Chat**: keep on the legacy backend until the new chat module exists.
10. **CORS**: the server only allows the origin set in `APP_URL` (`.env`). Add the frontend's origin (e.g. `http://localhost:5173`) to `APP_URL` on the backend, or requests will be blocked. If the frontend uses cookies, it must send `credentials: "include"`.
