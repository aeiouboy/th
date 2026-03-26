# E2E Test Cases

> Generated: 2026-03-26 | Runner: Playwright | Total: 5 | Pass: 3 | Fail: 2 | Skip: 0

---

### TC-001: Admin views approvals page with program filter

| Field | Detail |
|---|---|
| **Priority** | High |
| **Section** | E2E > Approvals Filter |
| **File** | `frontend/e2e/approvals-cr1-filter.spec.ts` |
| **Status** | pass |

**Preconditions:**
1. Logged in as tachongrak@central.co.th (admin)
2. Backend running on port 3001
3. Frontend running on port 3307

**Test Data:**
- User: tachongrak@central.co.th (admin)
- Password: password1234

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to /approvals | Page loads |
| 2 | Wait for page load + 1.5s | Approvals heading is visible |
| 3 | Verify h1/heading contains "Approvals" | Heading visible within 15s timeout |
| 4 | Verify search input is visible | Search input present |
| 5 | Call GET /approvals/pending via apiRequest | Response 200, body has `pending` array |
| 6 | Verify each pending item has `programs` array field | All items have programs field |
| 7 | If programs exist: click Programs filter dropdown | Dropdown opens with program options |
| 8 | Select first program | Filter applied, no crash |
| 9 | Click Clear to reset filter | Filter cleared, all items restored |

---

### TC-002: Search filter on approvals shows empty state for no-match query (NEGATIVE)

| Field | Detail |
|---|---|
| **Priority** | Medium |
| **Section** | E2E > Approvals Filter |
| **File** | `frontend/e2e/approvals-cr1-filter.spec.ts` |
| **Status** | pass |

**Preconditions:**
1. Logged in as tachongrak@central.co.th (admin)
2. Approvals page accessible

**Test Data:**
- User: tachongrak@central.co.th (admin)
- Search term: zzz_absolutely_no_match_xyz_999

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to /approvals | Page loads |
| 2 | Find search input (`input[placeholder*="Search"]`) | Search input visible |
| 3 | Fill input with "zzz_absolutely_no_match_xyz_999" | Input filled |
| 4 | Wait 800ms for debounce | — |
| 5 | Count rows matching the nonsense term | Zero rows match |
| 6 | Clear the search input | Input cleared |
| 7 | Verify page renders without crash | Body visible |

---

### TC-003: Profile page shows avatar upload area

| Field | Detail |
|---|---|
| **Priority** | High |
| **Section** | E2E > Profile Avatar |
| **File** | `frontend/e2e/profile-avatar.spec.ts` |
| **Status** | fail |
| **Bug** | IMPLEMENTATION BUG: profile/page.tsx getInitials() crashes |

**Preconditions:**
1. Logged in as tachongrak@central.co.th (admin)
2. Profile page accessible at /profile

**Test Data:**
- User: tachongrak@central.co.th (admin)

**Known Bug:**
`profile/page.tsx` line 55: `getInitials()` does `email[0].toUpperCase()` which crashes when email is an empty string `''`. This happens because `user?.email || ''` passes empty string when user data hasn't loaded yet. The page renders a "Runtime TypeError" dialog instead of the profile content.

Fix required: Add guard `if (!email || email.length === 0) return '?';` before line 55.

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to /profile | Page loads |
| 2 | Wait for networkidle + 2s | — |
| 3 | Verify h2 heading is visible | Profile heading with user's name |
| 4 | Verify `button[aria-label="Change photo"]` is visible | Camera button visible |
| 5 | Count `input[type="file"]` elements | At least 1 file input in DOM |
| 6 | Check file input accept attribute | Contains "image" |
| 7 | PUT /users/me/avatar with invalid URL | Response is NOT 404 (endpoint exists) |

**Actual Result:** Page crashes with "Runtime TypeError: Cannot read properties of undefined (reading 'toUpperCase')" — bug in `getInitials()` function.

---

### TC-004: Profile page edit form cancel preserves original name

| Field | Detail |
|---|---|
| **Priority** | High |
| **Section** | E2E > Profile Avatar |
| **File** | `frontend/e2e/profile-avatar.spec.ts` |
| **Status** | fail |
| **Bug** | Same as TC-003 — page crashes before Edit button renders |

**Preconditions:**
1. Logged in as tachongrak@central.co.th (admin)
2. Profile page accessible

**Test Data:**
- User: tachongrak@central.co.th (admin)
- Changed name (for cancel test): "Test Changed Name"

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to /profile | Page loads |
| 2 | Note h2 text as `initialNameText` | Original name captured |
| 3 | Click Edit button (Button with "Edit" text) | Edit form appears |
| 4 | Verify `input[placeholder="Your full name"]` visible | Full name input shown |
| 5 | Clear input and fill with "Test Changed Name" | Input updated |
| 6 | Click Cancel button | Form closes |
| 7 | Verify h2 text equals `initialNameText` | Original name restored, NOT "Test Changed Name" |

**Actual Result:** Page crashes before Edit button renders — same `getInitials()` bug as TC-003.

---

### TC-005: PUT /users/me/avatar API validates URL format (NEGATIVE)

| Field | Detail |
|---|---|
| **Priority** | Medium |
| **Section** | E2E > Profile Avatar |
| **File** | `frontend/e2e/profile-avatar.spec.ts` |
| **Status** | pass |
| **Notes** | API test — independent of profile page UI crash |

**Preconditions:**
1. Logged in as tachongrak@central.co.th (admin)
2. Backend running with avatar endpoint at PUT /users/me

**Test Data:**
- User: tachongrak@central.co.th (admin)
- Invalid URL: "not-a-valid-url"
- Valid URL: "https://example.com/valid-avatar.png"

**Steps:**

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to /profile (to get session cookies) | Session established |
| 2 | PUT /users/me/avatar with `{avatarUrl: "not-a-valid-url"}` | Response status 400 |
| 3 | Parse response body | Body has `message` field |
| 4 | PUT /users/me/avatar with `{avatarUrl: "https://example.com/valid-avatar.png"}` | Response status 200 |

---
