# Environment Setup

## Overview

This project uses two environment files:

- `backend/.env` — NestJS backend configuration
- `frontend/.env.local` — Next.js 16 frontend configuration

Copy the sample files and fill in your values before starting the servers.

```bash
cp backend/.env.sample backend/.env
# Create frontend/.env.local manually (no sample provided)
```

---

## Why `.env.local` for Next.js 16

Next.js 16 infers the workspace root based on the presence of lockfiles. When multiple `package-lock.json` or `pnpm-lock.yaml` files exist in parent directories, Next.js may resolve `.env` from the wrong directory. Using `.env.local` forces Next.js to load the file from the correct `frontend/` directory regardless of workspace configuration.

**Do not use `frontend/.env`** — it will silently fail to load on Next.js 16.

---

## Backend Variables

File: `backend/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | — | Supabase project URL. Find it in Dashboard → Settings → API. |
| `SUPABASE_ANON_KEY` | Yes | — | Supabase anonymous (public) API key. Safe to expose in server-side code. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Supabase service role key. Bypasses Row Level Security. Never expose to the client. |
| `SUPABASE_DB_URL` | Yes | — | PostgreSQL connection string via the transaction pooler (port 6543). Used for all runtime queries. |
| `SUPABASE_DIRECT_URL` | No | — | Direct PostgreSQL connection (port 5432). Used by Drizzle Kit for migrations only. If not set, Drizzle falls back to `SUPABASE_DB_URL`. |
| `SUPABASE_JWT_SECRET` | No | _(empty)_ | JWT shared secret for HS256 verification. **Must be left empty** for ECC P-256 (ES256) keys — see note below. |
| `PORT` | No | `3001` | Port the NestJS server listens on. |
| `FRONTEND_URL` | No | `http://localhost:3000` | Allowed CORS origin. Must match the URL where the frontend is served. |
| `TEAMS_WEBHOOK_URL` | No | _(empty)_ | Microsoft Teams Incoming Webhook URL for notification delivery. If not set, Teams delivery is silently disabled and notifications are only persisted to the database. |

### Example `backend/.env`

```env
SUPABASE_URL=https://lchxtkiceeyqjksganwr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL=postgresql://postgres.lchxtkiceeyqjksganwr:YOUR_PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
SUPABASE_DIRECT_URL=
SUPABASE_JWT_SECRET=
PORT=3001
FRONTEND_URL=http://localhost:3000
TEAMS_WEBHOOK_URL=https://your-org.webhook.office.com/webhookb2/...
```

### Why `SUPABASE_JWT_SECRET` Must Be Empty

Supabase projects use ECC P-256 (ES256) asymmetric keys — not the older HS256 shared secret. The backend verifies JWTs by fetching the public JWKS from:

```
https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json
```

If `SUPABASE_JWT_SECRET` is set to any value, the guard switches to HS256 symmetric verification and will reject all tokens with a signature mismatch error. Leave it empty to force JWKS-based ES256 verification.

### Database Connection Notes

- **Use the pooler host, not the direct host.** The direct host (`db.lchxtkiceeyqjksganwr.supabase.co`) does not resolve on new Supabase infrastructure (IPv6-only). All connections must go through the pooler.
- **Correct pooler host**: `aws-1-ap-northeast-1.pooler.supabase.com` (region: ap-northeast-1, Tokyo)
- **Incorrect pooler host** (old sample value): `aws-0-ap-southeast-1.pooler.supabase.com` — this will cause connection timeouts.

---

## Frontend Variables

File: `frontend/.env.local`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Supabase project URL. Embedded into the browser bundle — must match the backend `SUPABASE_URL`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Supabase anonymous key. Embedded into the browser bundle. Safe to expose (it is a public key). |
| `NEXT_PUBLIC_API_URL` | Yes | — | Base URL of the NestJS backend. All API calls are prefixed with this value. |

### Example `frontend/.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://lchxtkiceeyqjksganwr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Getting Your Credentials

1. Go to [supabase.com](https://supabase.com) and open your project.
2. Navigate to **Settings → API** to find `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Navigate to **Settings → Database → Connection string → Transaction pooler** to find `SUPABASE_DB_URL`. Select port 6543.
4. Your database password is set during project creation. If lost, reset it at **Settings → Database → Reset database password**.

---

## Verifying the Setup

After configuring both files, run these checks before starting the servers:

```bash
# Verify the JWKS endpoint is reachable
curl https://lchxtkiceeyqjksganwr.supabase.co/auth/v1/.well-known/jwks.json

# Start backend and verify it boots without errors
cd backend && npm run start:dev

# In another terminal, test the auth endpoint
curl http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

A `401 Unauthorized` response (not a 500 server error) confirms the backend is running and the JWT guard is active.
