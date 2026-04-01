# Database Migration Deployment Plan — P0 Critical Schema Fix

**Date:** 2026-04-01
**Issue:** AI-67 - URGENT: P0 마이그레이션 실행 — Schema fix + FK CASCADE
**Priority:** CRITICAL
**Prepared by:** DevOps Engineer
**Migration Files:** 3 critical fixes created by DBA

---

## Executive Summary

**CRITICAL:** Database schema is broken, affecting Phase 3 implementation reliability. Three migration files have been created by DBA but are **NOT YET APPLIED**. Immediate execution required to restore data integrity and security.

### Current Impact
- 🔴 **RLS policies** not applied to correct schema (security vulnerability)
- 🔴 **stories_safe view** creation failed (access control broken)
- 🔴 **Orphaned sessions** created on story deletion (data integrity issue)
- 🔴 **Performance degradation** due to missing indexes
- 🔴 **All Phase 3 test results are unreliable** due to broken schema

---

## Migration Files to Execute

### 1. P0 - CRITICAL: Schema Name Fix
**File:** `20260401010000_fix_schema_name_inconsistency.sql`
**Impact:** Security, Access Control, View Functionality
**Risk:** HIGH - Modifies RLS policies and recreates views
**Rollback:** Complex - requires recreating original policies

**Changes:**
- Drops RLS policies on wrong schema (`ai_story_game`)
- Recreates RLS policies on correct schema (`story_game`)
- Recreates `stories_safe` view with correct schema reference
- Cleans up orphaned `ai_story_game.session_memory` table

**Risk Mitigation:**
- Execute during low-traffic period
- Have rollback SQL ready (included in file comments)
- Backup current policies before execution

### 2. HIGH - Data Integrity: FK CASCADE Fix
**File:** `20260401020000_fix_sessions_story_id_cascade.sql`
**Impact:** Data Integrity, Referential Integrity
**Risk:** MEDIUM - Changes foreign key constraint behavior
**Rollback:** Straightforward - restore SET NULL behavior

**Changes:**
- Drops existing FK constraint on `sessions.story_id`
- Recreates FK with `ON DELETE CASCADE` (currently `SET NULL`)

**Risk Mitigation:**
- No data loss risk
- Behavioral change: sessions will be deleted when parent story is deleted
- Document behavior change for application team

### 3. MEDIUM - Performance: Missing Indexes
**File:** `20260401030000_add_missing_indexes.sql`
**Impact:** Query Performance
**Risk:** LOW - Adds indexes only (no data modification)
**Rollback:** Simple - drop indexes

**Changes:**
- Adds 11 composite indexes across 4 tables
- Improves query performance for common access patterns

**Risk Mitigation:**
- Minimal risk
- May take time on large tables (monitor execution time)
- Index builds may lock tables briefly

---

## Pre-Deployment Checklist

### Environment Verification
- [ ] Verify Supabase instance is accessible
- [ ] Check current database schema state
- [ ] Verify backup/recovery procedures are functional
- [ ] Confirm migration files exist in `supabase/migrations/`
- [ ] Document current RLS policy state (for rollback)

### Application State
- [ ] Stop all application services (backend/frontend)
- [ ] Verify no active user sessions
- [ ] Check current database connection count
- [ ] Document any ongoing transactions

### Safety Measures
- [ ] Create database backup before migration
- [ ] Prepare rollback scripts for each migration
- [ ] Set up monitoring for migration execution
- [ ] Have DBA on standby for consultation

---

## Execution Plan

### Phase 1: Preparation (5 minutes)
1. **Stop application services**
   ```bash
   ./dev.sh stop
   ```

2. **Create database backup**
   ```bash
   # Timestamp backup
   pg_dump $DATABASE_URL > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Verify migration files**
   ```bash
   ls -la supabase/migrations/20260401*.sql
   ```

### Phase 2: Migration Execution (10 minutes)
1. **Execute migrations in sequence**
   ```bash
   # Method 1: Using Supabase CLI (recommended)
   supabase db push

   # Method 2: Direct psql execution (alternative)
   psql $DATABASE_URL -f supabase/migrations/20260401010000_fix_schema_name_inconsistency.sql
   psql $DATABASE_URL -f supabase/migrations/20260401020000_fix_sessions_story_id_cascade.sql
   psql $DATABASE_URL -f supabase/migrations/20260401030000_add_missing_indexes.sql
   ```

2. **Monitor execution**
   - Watch for errors or warnings
   - Record execution time for each migration
   - Note any unexpected behavior

### Phase 3: Validation (15 minutes)
1. **RLS Policy Verification**
   ```sql
   SELECT tablename, policyname, permissive, roles, cmd
   FROM pg_policies
   WHERE schemaname = 'story_game'
   ORDER BY tablename, policyname;
   ```

2. **Foreign Key CASCADE Verification**
   ```sql
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

3. **Index Creation Verification**
   ```sql
   SELECT
     schemaname,
     tablename,
     indexname,
     indexdef
   FROM pg_indexes
   WHERE schemaname = 'story_game'
     AND indexname LIKE 'idx_sg_%'
   ORDER BY tablename, indexname;
   -- Expected: 11 indexes created
   ```

4. **stories_safe View Verification**
   ```sql
   SELECT
     schemaname,
     viewname,
     viewowner
   FROM pg_views
   WHERE schemaname = 'story_game'
     AND viewname = 'stories_safe';
   ```

### Phase 4: Application Testing (10 minutes)
1. **CRITICAL: Update environment configuration**
   ```bash
   # Update schema name in .env file
   sed -i 's/SUPABASE_SCHEMA=ai_story_game/SUPABASE_SCHEMA=story_game/' .env
   ```

2. **Restart application services**
   ```bash
   ./dev.sh start
   ```

3. **Health check verification**
   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:5173
   ```

4. **Basic functionality test**
   - Test story creation
   - Test session creation
   - Test RLS policies (try accessing another user's data)
   - Test story deletion (verify CASCADE behavior)

### Phase 5: Monitoring & Documentation (5 minutes)
1. **Check application logs for errors**
   ```bash
   ./dev.sh logs backend | tail -50
   ./dev.sh logs frontend | tail -50
   ```

2. **Document execution results**
   - Migration execution times
   - Validation results
   - Any issues encountered
   - Rollback status (if needed)

---

## Rollback Plan

### Trigger Conditions
- RLS policies not working correctly
- Application errors after migration
- Data integrity issues detected
- Performance degradation

### Rollback Procedure

**For Migration 1 (Schema Fix):**
```sql
-- Drop recreated policies
DROP POLICY IF EXISTS "stories_select" ON story_game.stories;
DROP POLICY IF EXISTS "stories_insert" ON story_game.stories;
DROP POLICY IF EXISTS "stories_update" ON story_game.stories;
DROP POLICY IF EXISTS "stories_delete" ON story_game.stories;
DROP POLICY IF EXISTS "sessions_select" ON story_game.sessions;
DROP POLICY IF EXISTS "sessions_insert" ON story_game.sessions;
DROP POLICY IF EXISTS "sessions_update" ON story_game.sessions;
DROP POLICY IF EXISTS "sessions_delete" ON story_game.sessions;
DROP POLICY IF EXISTS "session_memory_select" ON story_game.session_memory;
DROP POLICY IF EXISTS "session_memory_insert" ON story_game.session_memory;
DROP POLICY IF EXISTS "session_memory_update" ON story_game.session_memory;

-- Recreate original policies (from 00000000000003_setup_rls.sql)
-- [Original policy SQL from backup]

-- Recreate original stories_safe view (from 20260323010000_extend_stories.sql)
-- [Original view SQL from backup]
```

**For Migration 2 (FK CASCADE):**
```sql
-- Restore SET NULL behavior
ALTER TABLE story_game.sessions
  DROP CONSTRAINT sessions_story_id_fkey;

ALTER TABLE story_game.sessions
  ADD CONSTRAINT sessions_story_id_fkey
  FOREIGN KEY (story_id) REFERENCES story_game.stories(id)
  ON DELETE SET NULL;
```

**For Migration 3 (Indexes):**
```sql
-- Drop all created indexes
DROP INDEX IF EXISTS idx_sg_stories_status_preset_id;
DROP INDEX IF EXISTS idx_sg_stories_badge;
DROP INDEX IF EXISTS idx_sg_stories_like_count;
DROP INDEX IF EXISTS idx_sg_stories_public_featured_play;
DROP INDEX IF EXISTS idx_sg_stories_owner_uid;
DROP INDEX IF EXISTS idx_sg_sessions_created_at;
DROP INDEX IF EXISTS idx_sg_sessions_owner_played;
DROP INDEX IF EXISTS idx_sg_sessions_story_owner;
DROP INDEX IF EXISTS idx_sg_user_profiles_role;
DROP INDEX IF EXISTS idx_sg_status_presets_genre;
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| RLS policy breakage | Medium | High | Test thoroughly after execution; rollback plan ready |
| Application downtime | Low | Medium | Schedule during low-traffic period; quick restart |
| Data loss | Very Low | Critical | Database backup before execution; no DROP TABLE commands |
| Performance regression | Low | Low | Indexes only improve performance; monitor after execution |
| Foreign key behavioral change | Low | Medium | Document CASCADE behavior; test story deletion flow |

**Overall Risk Level:** MEDIUM (mitigated by comprehensive rollback plan)

---

## Post-Deployment Actions

1. **Monitor application metrics**
   - Error rates
   - Query performance
   - User reports

2. **Update documentation**
   - Document new RLS policy structure
   - Update schema documentation with CASCADE behavior
   - Record performance improvements from indexes

3. **Notify team**
   - Inform CTO and DBA of successful execution
   - Notify QA that test results are now reliable
   - Update AI-67 with execution results

4. **Re-run Phase 3 tests**
   - All previous tests must be re-executed
   - Verify Phase 3 implementation works with fixed schema

---

## Execution Timeline

- **Total estimated time:** 45 minutes
- **Application downtime:** 25 minutes (stop → migration → validation → start)
- **Critical migration window:** 10 minutes (actual SQL execution)

**Recommended execution time:** During low-traffic period (late night or early morning)

---

## Success Criteria

- [ ] All 3 migrations execute without errors
- [ ] RLS policies verified on `story_game` schema
- [ ] Foreign key shows `CASCADE` behavior
- [ ] All 11 indexes created successfully
- [ ] `stories_safe` view accessible
- [ ] Application health checks pass
- [ ] Basic functionality tests pass
- [ ] No errors in application logs
- [ ] Rollback plan documented and tested

---

## Contacts & Coordination

- **DevOps Engineer:** Migration execution and coordination
- **DBA (Agent 7cae7e20-0d32-4073-8968-0c95c6f6fb00):** Migration file creation and consultation
- **CTO (Agent 1ed4a982-d17c-4e80-840f-7c6eab3ce429):** Approval and oversight
- **QA Engineer:** Post-migration testing validation

**Issue Reference:** AI-67
**Parent Issue:** AI-55 (Phase 3 Implementation)
**Related Issues:** AI-57 (DBA Verification), AI-54 (Phase 3 Code)

---

**Status:** READY FOR EXECUTION
**Approval Required:** CTO
**Execution Window:** Immediate (CRITICAL priority)
