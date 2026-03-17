# Deployment Guide

## Prerequisites

- Node.js 20+
- pnpm 10+
- Supabase account with a project created
- Vercel account (recommended for frontend) or any Node.js hosting

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Note the following from your project settings:
   - Project URL (`SUPABASE_URL`)
   - Anon/public key (`SUPABASE_ANON_KEY`)
   - Service role key (`SUPABASE_SERVICE_ROLE_KEY`)
   - Database connection string (pooler) (`SUPABASE_DB_URL`)
   - Direct database connection string (`SUPABASE_DIRECT_URL`)
   - JWT secret (`SUPABASE_JWT_SECRET`)
3. Enable email/password authentication in Auth settings.

## 2. Database Migration

```bash
cd backend

# Set the direct database URL for migrations
export SUPABASE_DIRECT_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres"

# Run migrations
pnpm db:migrate

# Or push schema directly (for initial setup)
pnpm db:push
```

## 3. Backend Deployment

### Environment Variables

Set all variables from [env-setup.md](env-setup.md) in your hosting platform.

### Build and Run

```bash
cd backend
pnpm install --frozen-lockfile
pnpm build
pnpm start:prod
```

The backend runs on the port specified by `PORT` (default: 3001). The API is served under the `/api/v1` prefix. Swagger documentation is available at `/api/docs`.

### Recommended Hosting

- **Railway**, **Render**, or **Fly.io** for containerized deployments
- Any platform supporting Node.js 20+

## 4. Frontend Deployment (Vercel)

### Environment Variables

Set in Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (set to the deployed backend URL, e.g. `https://api.example.com`)

### Deploy

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm build
```

For Vercel: connect the repository, set the root directory to `frontend`, and Vercel will auto-detect Next.js.

For other platforms:

```bash
pnpm start
```

## 5. Post-Deploy Checklist

- [ ] Backend health check: `GET /api/v1/users/me` returns 401 (not 500)
- [ ] Swagger docs accessible at `/api/docs`
- [ ] Frontend loads login page
- [ ] Supabase Auth login works (create a test user)
- [ ] Authenticated API calls succeed (Bearer token)
- [ ] Database tables exist (check via Supabase dashboard or `db:studio`)
- [ ] Populate weekends for current year: `POST /api/v1/calendar/populate-weekends` with `{ "year": 2026 }`
- [ ] CORS configured correctly (`FRONTEND_URL` matches the deployed frontend domain)
- [ ] Cron jobs running (timesheet cutoff, budget recalculation, notifications)
- [ ] Teams webhook URL configured in Bot Framework registration (if using Teams integration)

## 6. Ongoing Maintenance

- **Database migrations**: Run `pnpm db:migrate` in the backend directory after pulling schema changes.
- **Weekend population**: Run the populate-weekends endpoint at the start of each year.
- **Budget recalculation**: Happens automatically via the scheduler, but can be triggered manually via `POST /api/v1/budgets/recalculate`.
- **Monitoring**: Check Supabase dashboard for database metrics. Monitor backend logs for scheduler execution and error rates.
