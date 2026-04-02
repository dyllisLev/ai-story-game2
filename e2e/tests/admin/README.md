# Admin Page E2E Tests

## Status: BLOCKED - 버그 수정되지 않음 (23:40 UTC 확인)

**최종 확인:** 2026-04-01 23:40 UTC
**CTO 보고:** "수정 완료"라고 하였으나 실제로는 버그 그대로 존재
**테스트 결과:** 브라우저 자동화로 무한 루프 확인
**상태:** 🔴 블로커 활성화 - 수정 필요
**Test Run:** 18/19 failed (6.8 minutes)
**Bug:** Dev skip button creates infinite loop

The admin page E2E tests are currently blocked because:

1. **No test admin user**: The admin page requires a logged-in user with admin role in Supabase
2. **No test auth setup**: There's no fixture or test setup to authenticate test users
3. **Tests assume skip button**: The tests were written assuming a "건너뭪기" (skip) button exists for development, but this feature is not implemented

## Bug Details: Skip Button Infinite Loop

**Test Results:**
- Run time: 6.8 minutes
- Results: 18/19 failed, 1 passed
- File: `e2e/tests/admin/admin-navigation.spec.ts`

**Failure Pattern:**
1. Test 1: `.a-auth-gate` element not found
2. Tests 2-17: Timeout (30s) waiting for skip button to work
3. Test 18: Page elements not visible

**Root Cause:**
`frontend/src/pages/Admin.tsx` lines 185-203 - Server verification `useEffect` depends on `[user]` and re-runs after `setMockAdminUser()`, causing infinite loop:

```tsx
useEffect(() => {
  if (!user) return;
  // Re-runs when mock user is set!
  const verifyAdmin = async () => {
    const response = await api.get('/admin/verify'); // FAILS - no real JWT
    setServerVerified(response.isAdmin); // Sets to false
  };
  verifyAdmin();
}, [user]); // ← Triggers after skip button clicked
```

**Verified via Browser Automation:**
1. Navigate to http://localhost:5173/admin
2. Shows: "로그인이 필요합니다" with "건너뛰기 (Dev)" button ✅
3. Click skip button
4. Shows: "관리자 권한 확인에 실패했습니다"
5. Another skip button appears
6. Click again → back to step 4 (infinite loop)

## Required Fixes Before Tests Can Run

### Fix Option 1: Skip Server Verification for Mock Admin (RECOMMENDED)
Add DEV mode check in the verification useEffect:

```tsx
useEffect(() => {
  if (!user) return;
  // Skip server verification for mock admin in DEV mode
  if (import.meta.env.DEV && user.id === 'dev-admin-user') {
    setServerVerified(true);
    return;
  }
  // ... existing verification code
}, [user]);
```

### Option 2: Add Backend Mock User Handling
Add special handling in `/api/admin/verify` endpoint for mock admin user ID.

### Option 3: Add Dev Skip Flag
Add state flag to prevent verification effect after skip button is used:

```tsx
const [devSkipped, setDevSkipped] = useState(false);

const handleDevSkip = () => {
  setMockAdminUser();
  setServerVerified(true);
  setDevSkipped(true); // Prevent verification
};

useEffect(() => {
  if (devSkipped) return; // Skip if dev skip was used
  // ... existing verification code
}, [user, devSkipped]);
```

### Legacy Options (Not Recommended - Skip Button Should Work)
Create a test admin user in the database with:
- Supabase Auth user account
- `user_profiles` entry with `role = 'admin'`

### Option 2: Development Skip Button
Add a "건너뛰기" (skip) button to the admin auth gate that:
- Only appears in development mode (`import.meta.env.DEV`)
- Bypasses authentication and sets a mock admin user
- Is NEVER included in production builds

### Option 3: Test Authentication Fixture
Create a Playwright fixture that:
- Creates a test user before tests run
- Logs in via `/api/auth/login` or Supabase Auth
- Sets cookies/storage for authenticated session
- Cleans up test user after tests complete

## Current Tests Created

The following test files have been created and are ready to run once authentication is set up:

1. **admin-navigation.spec.ts** (19 tests)
   - Auth gate testing
   - Navigation between sections
   - Layout and responsive design
   - Theme toggle

2. **admin-genre-settings.spec.ts** (11 tests)
   - Navigate to Genre Settings
   - Display all genre configurations
   - Edit genre name, icon, colors
   - Save changes

3. **admin-game-params.spec.ts** (17 tests)
   - Navigate to Game Parameters
   - Narrative length settings
   - Number stepper functionality
   - Min/max constraints
   - Save changes

## Test Execution Command

```bash
# Run all admin tests
npx playwright test e2e/tests/admin/

# Run specific test file
npx playwright test e2e/tests/admin/admin-genre-settings.spec.ts

# Run with HTML report
npx playwright test e2e/tests/admin/ --reporter=html
```

## Authentication Flow

The admin page uses:
1. Supabase Auth (JWT in cookie or Authorization header)
2. Server-side role verification via `/api/admin/verify`
3. Only users with `role = 'admin'` in `user_profiles` table can access

## Manual Testing

For manual testing, you can:
1. Create an admin user in Supabase
2. Set `role = 'admin'` in `user_profiles` table
3. Login via the main app login page
4. Navigate to `/admin`

## Related Issues

- **AI-102**: Migration (needed for genre_config table) - IN PROGRESS
- **AI-103**: Deployment (needed for frontend changes) - IN PROGRESS
- **AI-104**: This E2E testing task - BLOCKED on auth setup
