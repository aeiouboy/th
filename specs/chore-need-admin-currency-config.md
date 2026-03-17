# Chore: Admin Default Currency Configuration (Thai Baht)

## Metadata
adw_id: `need`
prompt: `allow admin to config currency default in thai baht`

## Chore Description
Currently, all currency formatting in the application is hardcoded to USD (`$` symbol, `en-US` locale). The system needs an admin-configurable default currency setting so the organization can display amounts in Thai Baht (฿ / THB) or other currencies. This involves:

1. Creating a `system_settings` table in the database to store key-value config (starting with `default_currency`)
2. Adding a backend settings module with CRUD endpoints (admin-only)
3. Updating the frontend `formatCurrency` functions (3 separate copies) to use the configured currency
4. Adding a Currency card to the existing admin Settings page UI

There are **3 separate `formatCurrency` implementations** that all need updating:
- `frontend/src/lib/utils.ts` — shorthand format (`$1.2M`, `$500K`) used by budget page & charts
- `frontend/src/components/reports/AlertList.tsx` — `Intl.NumberFormat` with `currency: 'USD'`
- `frontend/src/app/(authenticated)/admin/rates/page.tsx` — local `Intl.NumberFormat` with `currency: 'USD'`

## Relevant Files

### Existing Files to Modify
- `backend/src/database/schema/index.ts` — Add export for new `system-settings` schema
- `backend/src/app.module.ts` — Register new SettingsModule
- `frontend/src/lib/utils.ts` — Update `formatCurrency()` to accept/use configured currency
- `frontend/src/components/reports/AlertList.tsx` — Replace hardcoded `USD` with configured currency
- `frontend/src/app/(authenticated)/admin/rates/page.tsx` — Replace hardcoded `USD` with configured currency
- `frontend/src/components/reports/BudgetChart.tsx` — Uses `formatCurrency` from utils (auto-fixed)
- `frontend/src/app/(authenticated)/budget/page.tsx` — Uses `formatCurrency` from utils (auto-fixed)
- `frontend/src/app/(authenticated)/settings/page.tsx` — Add currency selector card (admin-only)

### New Files
- `backend/src/database/schema/system-settings.ts` — Drizzle schema for `system_settings` table
- `backend/src/settings/settings.module.ts` — NestJS module
- `backend/src/settings/settings.controller.ts` — REST endpoints: `GET /api/v1/settings`, `PUT /api/v1/settings/:key`
- `backend/src/settings/settings.service.ts` — Business logic with defaults
- `frontend/src/lib/currency.ts` — Shared currency context/hook: `useCurrency()` returns `{ currency, locale, formatCurrency }`

### Reference Files (read-only)
- `backend/src/database/drizzle.provider.ts` — How DB is injected
- `backend/src/database/database.module.ts` — How schema is registered
- `backend/src/common/guards/supabase-auth.guard.ts` — Auth guard for admin-only endpoints
- `frontend/src/lib/api.ts` — Frontend API client

## Step by Step Tasks

### 1. Create system_settings DB schema
- Create `backend/src/database/schema/system-settings.ts` with Drizzle pgTable:
  - `key` (varchar, primary key) — e.g. `'default_currency'`
  - `value` (varchar) — e.g. `'THB'`
  - `updated_at` (timestamp, defaultNow)
- Export from `backend/src/database/schema/index.ts`
- Run Supabase SQL to create the table and seed default: `INSERT INTO system_settings (key, value) VALUES ('default_currency', 'THB')`

### 2. Create backend Settings module
- Create `backend/src/settings/settings.service.ts`:
  - `getAll()` — returns all settings as `Record<string, string>`
  - `get(key)` — returns single setting value, with defaults (`default_currency` → `'THB'`)
  - `set(key, value)` — upsert setting (admin-only)
- Create `backend/src/settings/settings.controller.ts`:
  - `GET /settings` — returns all settings (any authenticated user)
  - `PUT /settings/:key` — update setting (admin-only, check `req.user.role === 'admin'`)
- Create `backend/src/settings/settings.module.ts` — wire service + controller
- Register SettingsModule in `backend/src/app.module.ts`

### 3. Create frontend currency hook
- Create `frontend/src/lib/currency.ts`:
  - `CurrencyProvider` React context that fetches `GET /api/v1/settings` on mount
  - `useCurrency()` hook returns `{ currency: string, formatCurrency: (value: number) => string, formatCurrencyShort: (value: number) => string }`
  - `formatCurrency` uses `Intl.NumberFormat` with the configured currency and `th-TH` locale for THB, `en-US` for USD
  - `formatCurrencyShort` provides the abbreviated format (`฿1.2M`, `฿500K`) for dashboard/chart use
  - Default to `THB` if settings API fails
- Wrap the app with `CurrencyProvider` in the authenticated layout or root layout

### 4. Update all formatCurrency call sites
- `frontend/src/lib/utils.ts` — Remove old `formatCurrency`, re-export from `currency.ts` for backward compat, or update callers
- `frontend/src/components/reports/AlertList.tsx` — Replace local `formatCurrency` with `useCurrency()` hook
- `frontend/src/app/(authenticated)/admin/rates/page.tsx` — Replace local `formatCurrency` with `useCurrency()` hook
- `frontend/src/components/reports/BudgetChart.tsx` — Already imports from utils, will get updated version
- `frontend/src/app/(authenticated)/budget/page.tsx` — Already imports from utils, will get updated version
- Verify no other files use `$` symbol directly for currency display

### 5. Add currency selector to Settings page
- Edit `frontend/src/app/(authenticated)/settings/page.tsx`:
  - Add a "Currency" card (visible to admin only) with a Select dropdown
  - Options: `THB` (฿ Thai Baht), `USD` ($ US Dollar), `EUR` (€ Euro), `JPY` (¥ Japanese Yen)
  - On change, call `PUT /api/v1/settings/default_currency` with new value
  - Show current value from `useCurrency()` hook
  - Show a preview of formatted amount (e.g., "Preview: ฿1,234,567.00")

### 6. Update unit tests
- Update `frontend/src/app/(authenticated)/budget/page.test.tsx` — mock currency context, expect ฿ instead of $
- Update `frontend/src/components/reports/AlertList.test.tsx` — update expected currency format
- Update any other tests that assert `$` formatted values
- Add backend unit test for SettingsService (`get`, `set`, `getAll`)

### 7. Validate
- Run `cd backend && pnpm test` — all pass
- Run `cd frontend && pnpm test` — all pass
- Run `cd frontend && npx playwright test --project=desktop` — all E2E pass
- Verify budget page shows ฿ instead of $
- Verify rates page shows ฿ instead of $
- Verify reports alert list shows ฿ instead of $
- Verify admin can change currency in settings page

## Validation Commands
- `cd /Users/tachongrak/Projects/ts/backend && pnpm test 2>&1 | tail -5` — Backend tests pass
- `cd /Users/tachongrak/Projects/ts/frontend && pnpm test 2>&1 | tail -5` — Frontend tests pass
- `cd /Users/tachongrak/Projects/ts/frontend && npx playwright test --project=desktop --reporter=list 2>&1 | tail -20` — E2E tests pass
- `grep -r 'THB\|฿\|default_currency' /Users/tachongrak/Projects/ts/frontend/src/lib/currency.ts` — Currency module exists with THB support
- `grep -r 'system_settings' /Users/tachongrak/Projects/ts/backend/src/database/schema/` — Schema exists
- `grep -r 'SettingsModule' /Users/tachongrak/Projects/ts/backend/src/app.module.ts` — Module registered
- `grep -rL 'USD' /Users/tachongrak/Projects/ts/frontend/src/lib/utils.ts` — No hardcoded USD in utils (should match since USD removed)

## Notes
- The `Intl.NumberFormat` with `style: 'currency', currency: 'THB'` and locale `th-TH` will automatically use the ฿ symbol and Thai number formatting
- For abbreviated format (฿1.2M), we need a custom formatter since `Intl.NumberFormat` doesn't support compact + currency well in all locales
- The settings page currently has no backend persistence (all state is local useState). This chore adds the first real persisted setting.
- Currency setting is system-wide (not per-user) — all users see the same currency
- Default is THB (Thai Baht) since this is a Thai organization
