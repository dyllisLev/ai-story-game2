# Post-Migration Test Plan

> **Purpose:** Comprehensive test execution plan for immediately after AI-67 (P0 Database Migration) completes
> **Prepared by:** QA Engineer
> **Date:** 2026-04-01
> **Trigger:** AI-67 migration completion

---

## Executive Summary

This document provides a **ready-to-execute test plan** for verifying the P0 database migration (AI-67) and re-running all E2E tests with the corrected schema.

**Why This Plan Matters:**
- Current test results are **unreliable** due to broken schema (RLS policies not working, FK issues, missing indexes)
- Once migration completes, we must **immediately verify** schema fixes and re-establish baseline test results
- This plan allows **rapid execution** without waiting for planning

**Prerequisites:**
- ✅ AI-67: P0 Migration executed (3 SQL files applied)
- ✅ Backend restarted with `SUPABASE_SCHEMA=story_game`
- ✅ Frontend running on `http://localhost:5173`
- ✅ Backend running on `http://localhost:3000`

---

## Phase 1: Migration Verification (30 minutes)

### 1.1 Schema Verification

**Objective:** Confirm migration SQL files were applied correctly

**Test Case MV-01: Verify RLS Policies on Correct Schema**

```sql
-- Query 1: Check RLS policies exist on story_game schema
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'story_game'
ORDER BY tablename, policyname;

-- Expected: At least 6 RLS policies (stories, sessions, session_memory, etc.)
```

**Pass Criteria:**
- ✅ Returns 6+ rows
- ✅ All policies on `story_game` schema (NOT `ai_story_game`)
- ✅ Stories table has RLS enabled

**Test Case MV-02: Verify FK CASCADE on sessions.story_id**

```sql
-- Query 2: Check FK constraint has CASCADE delete
SELECT
  tc.table_name,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'sessions'
  AND tc.constraint_name = 'sessions_story_id_fkey';

-- Expected: delete_rule = 'CASCADE'
```

**Pass Criteria:**
- ✅ `delete_rule` = 'CASCADE'
- ❌ NOT 'SET NULL'
- ❌ NOT 'NO ACTION'

**Test Case MV-03: Verify Missing Indexes Created**

```sql
-- Query 3: Check for 11 new indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'story_game'
  AND indexname LIKE '%_idx%'
ORDER BY tablename, indexname;

-- Expected: 11+ new indexes
```

**Pass Criteria:**
- ✅ Returns 11+ rows
- ✅ Indexes on: stories(slug), sessions(user_id, story_id), session_memory(session_id, category), etc.

**Test Case MV-04: Verify stories_safe View**

```sql
-- Query 4: Check view exists and works
SELECT * FROM story_game.stories_safe LIMIT 1;

-- Expected: Query succeeds without error
```

**Pass Criteria:**
- ✅ Query executes successfully
- ✅ Returns story data with proper field sanitization

---

## Phase 2: Backend Schema Connection (15 minutes)

### 2.1 Backend Configuration Verification

**Objective:** Confirm backend connects to correct schema

**Test Case BC-01: Verify Backend Uses story_game Schema**

```bash
# Check backend .env or config
grep SUPABASE_SCHEMA /home/paperclip/workspace/ai-story-game2/backend/.env

# Expected: SUPABASE_SCHEMA=story_game
# NOT: SUPABASE_SCHEMA=ai_story_game
```

**Pass Criteria:**
- ✅ `SUPABASE_SCHEMA=story_game`
- ✅ Backend restarted after migration

**Test Case BC-02: Backend Health Check**

```bash
curl -s http://localhost:3000/api/health | jq '.'

# Expected: {"status":"ok","timestamp":"..."}
```

**Pass Criteria:**
- ✅ Status = "ok"
- ✅ No schema-related errors in response

**Test Case BC-03: Test Simple API Call**

```bash
# Test stories list endpoint
curl -s http://localhost:3000/api/stories | jq '. | length'

# Expected: Returns stories (count > 0)
```

**Pass Criteria:**
- ✅ Returns array with count > 0
- ✅ No "schema does not exist" errors
- ✅ No "relation does not exist" errors

---

## Phase 3: E2E Test Re-execution (60 minutes)

### 3.1 Full E2E Test Suite

**Objective:** Re-establish baseline test results with correct schema

**Test Case E2E-01: Run All E2E Tests**

```bash
cd /home/paperclip/workspace/ai-story-game2
npm run test:e2e
```

**Expected Results:**
- **Baseline:** 30/34 tests passing (88.2% pass rate) - based on AI-64 fix
- **After Migration:** Should maintain or improve pass rate
- **Critical Failures:** 4 tests expected to fail (AI-68, AI-69 bugs)

**Pass Criteria:**
- ✅ 30+ tests pass
- ✅ No "Cannot navigate to invalid URL" errors (AI-64 verified)
- ✅ No schema-related errors (RLS, FK, etc.)
- ✅ Test infrastructure stable

**Test Case E2E-02: Verify Specific Failing Tests**

**Expected Failures (Pre-Migration Bugs):**
1. `e2e/tests/home/home-filters.spec.ts:10` - Genre chip click (AI-68)
2. `e2e/tests/home/home-filters.spec.ts:17` - Genre chip interaction (AI-68)
3. `e2e/tests/home/home-filters.spec.ts:29` - Multiple genre chips (AI-68)
4. `e2e/tests/play/play-rendering.spec.ts:36` - Input mode buttons (AI-69)

**Pass Criteria:**
- ✅ No NEW test failures introduced by migration
- ✅ Same 4 tests failing (or better if migration fixed them)
- ✅ No tests regress from passing to failing

---

## Phase 4: Regression Testing (45 minutes)

### 4.1 Critical User Flows

**Objective:** Verify core functionality works with corrected schema

**Test Case RG-01: User Registration Flow**

```bash
# Manual test or E2E test
# 1. Navigate to /signup
# 2. Fill form: test@example.com / Test1234
# 3. Submit
# 4. Verify redirect to /home or /login
```

**Pass Criteria:**
- ✅ Registration succeeds (AI-65 fix verified)
- ✅ User created in Supabase Auth
- ✅ No RLS policy errors blocking insert
- ✅ Profile created in `user_profiles` table

**Test Case RG-02: Story Creation Flow**

```bash
# Manual test: Login as admin
# Email: admin@example.com
# Password: AdminPass123
# 1. Navigate to /editor
# 2. Create new story
# 3. Fill title, genre, description
# 4. Submit
# 5. Verify story appears in /home
```

**Pass Criteria:**
- ✅ Story created successfully
- ✅ No FK constraint violations
- ✅ Story visible in list (RLS policies working)
- ✅ Slug unique and URL-friendly

**Test Case RG-03: Session Creation Flow**

```bash
# Manual test
# 1. Navigate to /play/{storyId}
# 2. Click "Start Session"
# 3. Verify session created
# 4. Check session_memory table populated
```

**Pass Criteria:**
- ✅ Session created with valid UUID
- ✅ `sessions.story_id` FK constraint satisfied
- ✅ Session memory records created (no schema errors)
- ✅ RLS policies allow user to see own sessions

**Test Case RG-04: Delete Story Cascade Test**

```bash
# Critical FK CASCADE verification
# 1. Create a story
# 2. Create sessions for that story
# 3. Delete the story
# 4. Verify sessions are deleted (CASCADE)
```

**Pass Criteria:**
- ✅ Story deletion succeeds
- ✅ Related sessions automatically deleted (CASCADE)
- ✅ No orphaned session records remain
- ✅ No FK constraint violations

---

## Phase 5: Admin Functionality Verification (30 minutes)

### 5.1 Admin Access & Features

**Objective:** Verify admin account and panel work correctly

**Test Case AD-01: Admin Login**

```bash
# Manual test
Email: admin@example.com
Password: AdminPass123
URL: http://localhost:5173/login
```

**Pass Criteria:**
- ✅ Login succeeds
- ✅ Admin JWT token issued
- ✅ Redirect to /admin or /home

**Test Case AD-02: Admin Panel Access**

```bash
# Navigate to http://localhost:5173/admin
# Check access to admin sections
```

**Pass Criteria:**
- ✅ Admin dashboard loads
- ✅ User management visible (70 test cases now accessible)
- ✅ Story presets accessible
- ✅ API logs viewable
- ✅ No 403 Forbidden errors

**Test Case AD-03: Admin RLS Policies**

```bash
# Verify admin can see ALL data
SELECT COUNT(*) FROM story_game.stories;
# Compare with frontend admin view
```

**Pass Criteria:**
- ✅ Admin can see all stories (not just own)
- ✅ Admin can see all users
- ✅ Admin can see all sessions
- ✅ RLS policies properly bypass for admin role

---

## Phase 6: Performance Verification (30 minutes)

### 6.1 Index Performance

**Objective:** Verify 11 new indexes improve performance

**Test Case PF-01: Query Performance Comparison**

```sql
-- Test 1: Stories by slug (should use index)
EXPLAIN ANALYZE
SELECT * FROM story_game.stories WHERE slug = 'test-story';

-- Expected: Index Scan on stories_slug_idx (not Seq Scan)

-- Test 2: User sessions (should use index)
EXPLAIN ANALYZE
SELECT * FROM story_game.sessions
WHERE user_id = 'uuid-here' AND story_id = 'uuid-here';

-- Expected: Index Scan on sessions_user_id_story_id_idx
```

**Pass Criteria:**
- ✅ Index Scan used (not Seq Scan)
- ✅ Query time < 10ms for indexed queries
- ✅ No full table scans on filtered queries

**Test Case PF-02: Concurrent Session Performance**

```bash
# Test: Load 100 sessions simultaneously
# Measure response time
```

**Pass Criteria:**
- ✅ p95 response time < 500ms
- ✅ No deadlocks or timeouts
- ✅ Indexes prevent slow queries

---

## Phase 7: Bug Verification (30 minutes)

### 7.1 Verify Previously Fixed Bugs

**Objective:** Confirm AI-64, AI-65, AI-66 fixes still work

**Test Case BV-01: E2E Infrastructure (AI-64)**

```bash
# Run E2E tests
npm run test:e2e
```

**Pass Criteria:**
- ✅ 30/34 tests passing (maintained)
- ✅ No baseURL errors
- ✅ Page navigation working

**Test Case BV-02: Signup Form (AI-65)**

```bash
# Test signup with valid password
# Email: test@example.com
# Password: Test1234
```

**Pass Criteria:**
- ✅ Password validation works (uppercase + lowercase + number)
- ✅ Error messages clear and in Korean
- ✅ Successful registration creates profile

**Test Case BV-03: Admin Account (AI-66)**

```bash
# Login as admin
admin@example.com / AdminPass123
```

**Pass Criteria:**
- ✅ Admin account exists and is active
- ✅ Admin can access /admin
- ✅ Admin role properly set in metadata

---

## Test Execution Summary

### Timeline

| Phase | Duration | Run Order |
|-------|----------|-----------|
| Phase 1: Migration Verification | 30 min | 1st |
| Phase 2: Backend Connection | 15 min | 2nd |
| Phase 3: E2E Tests | 60 min | 3rd |
| Phase 4: Regression Tests | 45 min | 4th |
| Phase 5: Admin Features | 30 min | 5th |
| Phase 6: Performance | 30 min | 6th |
| Phase 7: Bug Verification | 30 min | 7th |
| **Total** | **4 hours** | |

### Success Criteria

**Migration Success:**
- [ ] MV-01 to MV-04: All schema verification queries pass
- [ ] BC-01 to BC-03: Backend connects to story_game schema
- [ ] No "schema does not exist" errors
- [ ] No "relation does not exist" errors

**Test Baseline Re-established:**
- [ ] E2E-01: 30/34 tests passing (88.2%)
- [ ] No NEW test failures from migration
- [ ] Test infrastructure stable

**Critical User Flows Working:**
- [ ] RG-01: User registration works
- [ ] RG-02: Story creation works
- [ ] RG-03: Session creation works
- [ ] RG-04: Delete cascades correctly

**Admin Features Unblocked:**
- [ ] AD-01: Admin login works
- [ ] AD-02: Admin panel accessible
- [ ] AD-03: Admin RLS policies bypass correctly

**Performance Improved:**
- [ ] PF-01: Indexes used (not Seq Scan)
- [ ] PF-02: p95 response time < 500ms

**Previous Fixes Maintained:**
- [ ] BV-01: E2E infrastructure stable
- [ ] BV-02: Signup form works
- [ ] BV-03: Admin account works

---

## Test Execution Commands

### Quick Start (Copy-Paste Ready)

```bash
# Set workspace
cd /home/paperclip/workspace/ai-story-game2

# Phase 1: Schema Verification (via psql or Supabase SQL Editor)
# See SQL queries above in MV-01 to MV-04

# Phase 2: Backend Connection
grep SUPABASE_SCHEMA backend/.env
curl -s http://localhost:3000/api/health | jq '.'
curl -s http://localhost:3000/api/stories | jq '. | length'

# Phase 3: E2E Tests
npm run test:e2e

# Phase 4-7: Manual tests (see test cases above)
# Or use E2E test suite for automation
```

---

## Failure Handling

### If Phase 1 (Schema Verification) Fails

**Symptom:** Schema queries return errors or missing data

**Actions:**
1. **STOP** - Do not proceed to E2E tests
2. Check migration execution logs
3. Verify SQL files executed in correct order
4. Re-run migration files manually if needed
5. Contact DBA for manual schema verification

### If Phase 2 (Backend Connection) Fails

**Symptom:** Backend can't connect to story_game schema

**Actions:**
1. Restart backend: `./dev.sh restart backend`
2. Verify `SUPABASE_SCHEMA=story_game` in .env
3. Check backend logs for schema errors
4. Test with Supabase client directly

### If Phase 3 (E2E Tests) Shows Regressions

**Symptom:** New test failures not seen before migration

**Actions:**
1. Compare test results with pre-migration baseline
2. Identify NEW failing tests (not the 4 known bugs)
3. Check for RLS policy violations
4. Verify FK CASCADE not breaking queries
5. Rollback migration if critical regressions found

---

## Reporting

### Test Report Template

After execution, create report: `docs/sdlc/phase6-system-test/06-Post-Migration-Test-Results.md`

**Sections:**
1. **Execution Summary:** Date, time, migration version
2. **Test Results:** Pass/fail counts per phase
3. **Issues Found:** Any new bugs discovered
4. **Comparison:** Pre-migration vs post-migration results
5. **Recommendations:** Ready for deployment? Additional fixes needed?

---

## Sign-off

**Prepared by:** QA Engineer (Agent f357226d-9584-4675-aa21-1127ac275f18)

**Status:** 📋 **READY TO EXECUTE** (Awaiting AI-67 completion)

**Trigger Event:** AI-67 status changes to "done" or migration execution confirmed

**Estimated Execution Time:** 4 hours

**Next Action:** Monitor AI-67, execute immediately upon completion
