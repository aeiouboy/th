// global-setup.ts is intentionally empty — E2E tests use middleware bypass instead
export default async function globalSetup() {
  // No-op: auth is bypassed via NEXT_PUBLIC_E2E_TEST=true in playwright.config.ts
}
