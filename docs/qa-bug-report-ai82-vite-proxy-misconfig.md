# QA Bug Report - AI-82 Bug #2: Vite Proxy Misconfiguration

**Report Date**: 2026-04-01
**Test Cycle**: AI-82 - 전체 플로우 검증 (End-to-end Flow Verification)
**QA Engineer**: QA Engineer (f357226d-9584-4675-aa21-1127ac275f18)
**Severity**: 🔴 CRITICAL - 100% of authentication broken
**Status**: DISCOVERED - Not yet fixed

---

## Executive Summary

**CRITICAL BUG**: The Vite proxy configuration in `frontend/vite.config.ts` is incorrectly rewriting API paths, causing **ALL frontend authentication to fail**. Users cannot login, signup, or access any authenticated features through the UI.

**Impact**: This bug completely breaks the user authentication flow, making the application unusable for any authenticated features.

**Affected Flows**:
- ❌ Flow 1.1: Signup/Login - BROKEN
- ❌ Flow 1.3-1.6: All authenticated user flows - BROKEN
- ❌ Flow 2.1-2.7: All admin flows - BROKEN
- ❌ Flow 3.1-3.4: All editor flows - BROKEN

**Total Impact**: 14 out of 17 flows (82%) are completely broken.

---

## Bug Details

### Bug #2: Vite Proxy Path Rewrite Causing Double API Version Prefix

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL - Application Breaking |
| **Component** | `frontend/vite.config.ts` |
| **Location** | Line 18 - Proxy rewrite rule |
| **Error Type** | Configuration Error |
| **Discovery Method** | E2E testing during Flow 1.1 login attempt |

### Root Cause

The Vite proxy configuration incorrectly rewrites API paths by prepending `/v1` to paths that already contain `/v1`:

```typescript
// ❌ BROKEN CONFIGURATION (line 18)
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '/api/v1'),  // ❌ WRONG!
  },
}
```

**What Happens**:
1. Frontend calls: `/api/v1/auth/login`
2. Proxy rewrites: `/api/v1/auth/login` → `/api/v1/v1/auth/login` (WRONG!)
3. Backend receives: `POST /api/v1/v1/auth/login`
4. Backend responds: **404 Not Found**

### Evidence

**Browser Network Request**:
```
POST http://localhost:5173/api/v1/auth/login
Status: 404 Not Found
Response: {"message":"Route POST:/api/v1/v1/auth/login not found"}
```

**Direct Backend API Call** (Works correctly):
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"qa-user1@test.com","password":"UserPass123"}'

# Response: 200 OK
{
  "user": {...},
  "accessToken": "...",
  "refreshToken": "..."
}
```

**Frontend Proxy Call** (Broken):
```bash
curl -X POST http://localhost:5173/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"qa-user1@test.com","password":"UserPass123"}'

# Response: 404 Not Found
{
  "message":"Route POST:/api/v1/v1/auth/login not found",
  "error":"Not Found",
  "statusCode":404
}
```

---

## Reproduction Steps

1. Navigate to http://localhost:5173/login
2. Enter valid credentials:
   - Email: `qa-user1@test.com`
   - Password: `UserPass123`
3. Click "로그인" (Login) button
4. Observe: Page does not redirect, user remains on login page
5. Check browser network tab: See `POST /api/v1/auth/login` returning 404
6. Check response body: Shows "Route POST:/api/v1/v1/auth/login not found"

### Expected Behavior

- User should be redirected to home page (`/`) after successful login
- Auth token should be stored in localStorage
- User should see their nickname in the navigation

### Actual Behavior

- User remains on login page
- No redirect occurs
- Auth token is NOT stored (localStorage is empty)
- Network request fails with 404 error
- Error shows double `/v1/v1/` in the path

---

## Impact Assessment

### User Impact

| Feature | Status | Notes |
|---------|--------|-------|
| **Signup** | ❌ BROKEN | New users cannot register |
| **Login** | ❌ BROKEN | Existing users cannot login |
| **Profile Management** | ❌ BROKEN | Cannot access settings |
| **API Key Management** | ❌ BROKEN | Cannot save API keys |
| **Game Sessions** | ❌ BROKEN | Cannot start/play games |
| **Session History** | ❌ BROKEN | Cannot view past sessions |
| **Admin Panel** | ❌ BROKEN | Admins cannot access admin features |
| **Story Editor** | ❌ BROKEN | Cannot create/edit stories |

**Affected Users**: 100% of users requiring authentication

**Affected Flows**: 14/17 flows (82%)

### Business Impact

- **Revenue Impact**: HIGH - Users cannot use paid features
- **User Trust**: CRITICAL - Login is a core feature, users will perceive app as broken
- **Data Loss**: MEDIUM - Users cannot access their saved sessions, stories, or settings
- **Admin Impact**: CRITICAL - Admins cannot manage users, stories, or settings

---

## Technical Analysis

### Why This Bug Wasn't Caught Earlier

1. **Backend API Works**: Direct calls to backend (port 3000) work perfectly
2. **No Integration Tests**: E2E tests may not have covered the login flow
3. **Manual Testing**: Developers may have tested backend directly without going through Vite proxy
4. **Environment Mismatch**: Production may use different proxy configuration

### Why This Is Critical

1. **Complete Feature Blocker**: No authenticated features work at all
2. **User Experience**: Users see login form but it doesn't work
3. **No Workaround**: Users cannot bypass this to access their accounts
4. **Silent Failure**: No clear error message shown to users
5. **Affects All Environments**: Any environment using this Vite config is broken

---

## Required Fix

### Fix Location

**File**: `frontend/vite.config.ts`
**Line**: 18
**Current Code**: `rewrite: (path) => path.replace(/^\/api/, '/api/v1')`

### Fix Options

**Option 1: Remove Rewrite Rule (RECOMMENDED)**

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    // ❌ REMOVE THIS LINE:
    // rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
  },
}
```

**Rationale**: The frontend already calls `/api/v1/*` endpoints, so no rewrite is needed. The proxy should forward requests as-is.

**Option 2: Conditional Rewrite**

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path) => {
      // Only rewrite if path doesn't already have /v1/
      if (path.match(/^\/api\/v1\//)) {
        return path; // Already has version, don't rewrite
      }
      return path.replace(/^\/api/, '/api/v1');
    },
  },
}
```

**Rationale**: Handles both cases, but more complex. Option 1 is simpler and safer.

### Validation Steps After Fix

1. Apply fix to `frontend/vite.config.ts`
2. Restart Vite dev server: `cd frontend && npm run dev`
3. Test login at http://localhost:5173/login:
   - Enter credentials
   - Click login
   - Verify redirect to home page
4. Verify auth token stored:
   ```javascript
   localStorage.getItem('sb-ai-story-game-auth-token')
   // Should return: JWT token string
   ```
5. Test API call through frontend:
   ```bash
   curl -X POST http://localhost:5173/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"qa-user1@test.com","password":"UserPass123"}'
   # Should return: 200 OK with tokens
   ```

---

## Testing Strategy

### Pre-Fix Verification

**Status**: Bug confirmed and documented

✅ **Backend API works**: Direct calls to port 3000 successful
✅ **Proxy misconfiguration identified**: Double `/v1/v1/` in rewritten path
✅ **Reproduction steps documented**: Clear path to reproduce
✅ **Impact assessed**: 14/17 flows broken (82%)

### Post-Fix Testing Plan

Once fix is applied, QA will:

1. **Verify Fix**:
   - Test login with qa-user1@test.com
   - Test signup with new account
   - Verify token storage
   - Verify redirect after login

2. **Regression Test**:
   - Re-test Phase 1 flows (unauthenticated)
   - Test all 14 authenticated flows
   - Verify no new issues introduced

3. **Comprehensive Testing**:
   - Test all user flows (1.3-1.6)
   - Test all admin flows (2.1-2.7)
   - Test all editor flows (3.1-3.4)
   - Verify proxy doesn't break other API calls

---

## Related Issues

### Dependencies

- **Bug #1 (Play.tsx syntax error)**: ✅ FIXED
- **Bug #2 (This issue)**: 🔴 CRITICAL - BLOCKS ALL AUTHENTICATED TESTING

### Impact on AI-82

This bug **blocks completion of AI-82** because:
- Cannot test 14 out of 17 flows (82%)
- Cannot verify any authenticated features
- Cannot test admin panel
- Cannot test editor
- Cannot test game sessions

### Workaround for Testing

**Option 1: Direct Backend API Testing**
- Test backend APIs directly on port 3000
- Bypass frontend proxy for testing
- Limited value - doesn't test actual user flow

**Option 2: Manual Token Injection**
- Login via backend API to get token
- Manually inject token into localStorage
- Test authenticated flows with injected token
- More complete testing but technical complexity

**Option 3: Wait for Fix (RECOMMENDED)**
- Flag this bug as CRITICAL
- Escalate to CTO for immediate fix
- Resume testing once proxy is fixed
- Most accurate testing approach

---

## Timeline

| Timestamp | Event |
|-----------|-------|
| 2026-04-01 08:00 | Discovered during Flow 1.1 login testing |
| 2026-04-01 08:20 | Root cause identified in vite.config.ts |
| 2026-04-01 08:25 | Bug report completed and documented |
| Pending | Fix applied by development team |
| Pending | Post-fix verification and regression testing |

---

## Recommendations

### Immediate Actions (Critical)

1. **🔴 URGENT**: Fix vite.config.ts line 18
   - Remove or fix the proxy rewrite rule
   - Restart Vite dev server
   - Verify login works

2. **🔴 URGENT**: Resume AI-82 testing after fix
   - Complete authenticated flow testing
   - Verify all 14 broken flows
   - Complete full test suite

### Long-term Actions

1. **Add Integration Test**: Cover login flow in E2E tests
2. **Proxy Configuration Review**: Audit all proxy rules
3. **Environment Parity**: Ensure dev/staging/proxy configs match
4. **Pre-commit Hooks**: Check for common proxy misconfigurations

### Prevention

1. **E2E Test Coverage**: Add login/signup to automated E2E tests
2. **Integration Testing**: Test through proxy, not just backend
3. **Config Validation**: Add Vite config validation script
4. **Developer Documentation**: Document proxy configuration pitfalls

---

## Communication

### Escalation

- **Issue**: AI-82 (전체 플로우 검증)
- **Status**: BLOCKED (second blocker)
- **Assigned To**: QA Engineer (f357226d-9584-4675-aa21-1127ac275f18)
- **Escalated To**: CTO (1ed4a982-d17c-4e80-840f-7c6eab3ce429)
- **Priority**: 🔴 CRITICAL - Blocks 82% of application features

### Comments to be Posted

1. **AI-82 Issue Comment**: Tag @CTO with full bug details
2. **Bug Severity**: Mark as CRITICAL with immediate action required
3. **Blocker Status**: Update AI-82 to "blocked" until proxy is fixed

---

## Conclusion

This is a **CRITICAL BUG** that completely breaks user authentication. The Vite proxy misconfiguration causes all frontend API calls to fail with a 404 error.

**No authenticated features work until this is fixed.**

**Fix is simple**: Remove or correct the proxy rewrite rule in `frontend/vite.config.ts` line 18.

**Testing is blocked**: AI-82 cannot proceed until this bug is fixed.

---

**Report Generated**: 2026-04-01 08:25
**QA Engineer**: f357226d-9584-4675-aa21-1127ac275f18
**Run ID**: 75d1a69c-16d6-4757-b7c4-ca27dc175699
**Issue**: AI-82 - 전체 플로우 검증
**Status**: BLOCKED - Awaiting critical bug fix
