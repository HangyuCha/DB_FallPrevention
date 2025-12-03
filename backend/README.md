# Backend Server

This folder contains a minimal Express.js backend for the DB project. It provides a health check and placeholder API routes you can later connect to a real database.

## Setup

1. Install dependencies from the project root:

```bash
npm install
```

2. Environment variables: create `.env` in the project root:

```
PORT=5000
ORIGIN=http://localhost:5173
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this"
```

- `PORT`: backend server port.
- `ORIGIN`: allowed CORS origin (the Vite dev server runs on 5173 by default).
- `DATABASE_URL`: SQLite database file for Prisma.
- `JWT_SECRET`: secret for signing JWTs.

## Run

- Backend only:

```bash
npm run server
```

- Backend with auto-reload:

```bash
npm run server:dev
```

- Frontend + Backend together (parallel):

```bash
npm run dev:full
```

The backend will be available at `http://localhost:5000`, with a health endpoint:

```
GET /api/health
```

## API (placeholders)

- `GET /api/videos`: Example response list of videos.
- `GET /api/detections`: Example response list of detections.
- `POST /api/tags`: Create a tag (requires JSON body `{ "name": "..." }`).

Replace the placeholder implementations with actual DB queries as the next step.

## Database

Initialize the SQLite DB and generate Prisma client:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

This creates `dev.db` under `prisma/` and prepares the `User` table.

## Auth & Users

- `POST /api/auth/register` body `{ email, password, name? }` → creates user
- `POST /api/auth/login` body `{ email, password }` → returns `{ token, user }`
- Include header `Authorization: Bearer <token>` for protected routes:
	- `GET /api/users`
	- `GET /api/users/:id`
	- `PUT /api/users/:id` body `{ name }`
	- `DELETE /api/users/:id`
