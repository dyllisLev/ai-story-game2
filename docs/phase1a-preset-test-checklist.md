# Phase 1A Preset Test Checklist

**Issue:** [AI-247](/AI/issues/AI-247)
**Migration:** `20260403100000_phase1a_core_genre_presets.sql`
**Commit:** `12cc327`
**Date:** 2026-04-03

## Pre-Migration Checklist

### 1. Database Backup
- [ ] Create backup of production database
- [ ] Note current preset count for comparison

### 2. Migration Validation
- [ ] Review SQL syntax
- [ ] Check for duplicate IDs
- [ ] Verify JSON structure for status_presets
- [ ] Verify JSON structure for characters
- [ ] Check for proper foreign key relationships

### 3. Code Review
- [ ] Review preset quality (world_setting, story, characters)
- [ ] Check genre consistency
- [ ] Verify system_rules are comprehensive
- [ ] Ensure Korean language quality

## Post-Migration Testing

### 1. Database Verification
```sql
-- Check status_presets created
SELECT COUNT(*) FROM story_game.status_presets
WHERE id IN ('f1-status-base', 'm1-status-base', 'r1-status-base');
-- Expected: 3

-- Check presets created
SELECT COUNT(*) FROM story_game.presets
WHERE id LIKE 'f1-%' OR id LIKE 'f2-%' OR id LIKE 'f3-%'
   OR id LIKE 'f4-%' OR id LIKE 'f5-%'
   OR id LIKE 'm1-%' OR id LIKE 'm2-%' OR id LIKE 'm3-%'
   OR id LIKE 'm4-%' OR id LIKE 'm5-%'
   OR id LIKE 'r1-%' OR id LIKE 'r2-%' OR id LIKE 'r3-%'
   OR id LIKE 'r4-%' OR id LIKE 'r5-%';
-- Expected: 15

-- Verify genre distribution
SELECT genre, COUNT(*) FROM story_game.presets
WHERE id LIKE 'f%_' OR id LIKE 'm%_' OR id LIKE 'r%_'
GROUP BY genre;
-- Expected: Fantasy 5, Modern 5, Romance 5
```

### 2. API Testing

#### Preset List Endpoint
- [ ] `GET /api/stories` returns all 15 new presets
- [ ] Filter by genre works correctly
- [ ] Pagination works
- [ ] Preset metadata is complete

#### Preset Detail Endpoint
- [ ] `GET /api/stories/:id` returns full preset data
- [ ] status_preset_id is populated
- [ ] Characters JSON is valid
- [ ] System rules are included

### 3. Game Editor Testing

For each preset, test:

#### Fantasy Presets
- [ ] **이세계 소환**: Create session, verify HP/MP/레벨/경험치/골드 attributes work
- [ ] **다크 판타지**: Verify characters load correctly
- [ ] **왕국 건설**: Test inventory and kingdom management mechanics
- [ ] **학원 판타지**: Verify academy setting and quest system
- [ ] **크리처 레이징**: Test dragon growth mechanics

#### Modern Presets
- [ ] **오피스 로맨스**: Verify workplace romance mechanics
- [ ] **캠퍼스 라이프**: Test campus life system
- [ ] **스타트업 창업**: Verify startup funding and team mechanics
- [ ] **의료 드라마**: Test medical drama elements
- [ ] **아이돌 연습생**: Verify idol training system

#### Romance Presets
- [ ] **첫사랑**: Test first love mechanics (호감도, 자존감)
- [ ] **직장 비밀 연애**: Verify secret romance tension
- [ ] **시간여행자**: Test time travel paradox elements
- [ ] **계약 결혼**: Verify contract marriage progression
- [ ] **재회**: Test reunion and healing mechanics

### 4. AI Storytelling Testing

For each preset, start a game session and verify:

#### Story Quality
- [ ] AI follows the system_rules
- [ ] Genre tone is maintained
- [ ] Character voices are distinct
- [ ] Story progresses logically
- [ ] Status window updates are relevant

#### Gameplay Mechanics
- [ ] Status window attributes update correctly
- [ ] Character interactions are meaningful
- [ ] Choices have consequences
- [ ] World setting is respected
- [ ] Genre tropes are effectively used

#### User Experience
- [ ] Preset is immediately playable
- [ ] Starting hook is engaging
- [ ] Initial goals are clear
- [ ] Characters are well-introduced
- [ ] No grammatical errors in Korean

## Bug Tracking

### Critical Bugs (Block Release)
- _Template: [Preset Name] - Bug Description - Severity - Status_

### Major Bugs (Fix Before Launch)
- _Template: [Preset Name] - Bug Description - Severity - Status_

### Minor Bugs (Can Defer)
- _Template: [Preset Name] - Bug Description - Severity - Status_

## Test Results Summary

### Pass/Fail by Genre
- Fantasy: [ ] Pass / [ ] Fail (X/5 presets)
- Modern: [ ] Pass / [ ] Fail (X/5 presets)
- Romance: [ ] Pass / [ ] Fail (X/5 presets)

### Overall Assessment
- [ ] All 15 presets meet quality standards
- [ ] Ready for production deployment
- [ ] Requires additional work

### Tester Notes
_Include qualitative feedback on storytelling, gameplay, and user experience_

## Sign-off

- **Tester:** _______________
- **Date:** _______________
- **Approved for Production:** [ ] Yes [ ] No

---

## Next Steps After Testing

1. **Fix any critical bugs** found during testing
2. **Update system_rules** based on gameplay feedback
3. **Optimize AI prompts** if story quality needs improvement
4. **Create additional presets** for Phase 1B (supporting genres)
5. **Deploy to production** after all tests pass
