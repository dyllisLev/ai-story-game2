# QA Test Execution Plan - AI-82 Flow Verification

**Prepared By**: QA Engineer (f357226d-9584-4675-aa21-1127ac275f18)
**Prepared For**: CTO + Development Team
**Date**: 2026-04-01
**Trigger**: Executed after `frontend/src/pages/Play.tsx` syntax error is fixed

---

## Prerequisites (Must Complete Before Testing)

1. ✅ **Backend running** on port 3000 - `curl http://localhost:3000/api/health`
2. ✅ **Frontend running** on port 5173 - `curl http://localhost:5173`
3. ❌ **Syntax error fixed** - Lines 134-141 removed from `frontend/src/pages/Play.tsx`
4. ⏳ **Home page loads** - Verify `http://localhost:5173` shows UI
5. ⏳ **React mounts** - Verify `document.getElementById('root').innerHTML.length > 0`

---

## Test Environment Setup

### Agent Browser Session

```bash
# Initialize browser session
agent-browser open http://localhost:5173
agent-browser wait --load networkidle

# Verify page loaded
agent-browser eval 'document.title'  # Should return "스토리월드 — AI 인터랙티브 스토리"
agent-browser get text body | wc -l  # Should return > 0
```

### Test Accounts

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Admin | (from docs/qa-test-accounts.md) | (from docs) | Admin flows |
| User | (from docs/qa-test-accounts.md) | (from docs) | User flows |
| Guest | N/A | N/A | Unauthenticated flows |

---

## Phase 1: User Flows (6 Flows)

### Flow 1.1: Signup/Login

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| U1.1.1 | Navigate to Signup | 1. Open /signup<br>2. Verify form fields | Email, password, nickname fields visible |
| U1.1.2 | Valid Signup | 1. Fill valid data<br>2. Submit<br>3. Check redirect | Redirect to /, user logged in |
| U1.1.3 | Duplicate Email | 1. Signup with existing email<br>2. Submit | Error message shown |
| U1.1.4 | Login Success | 1. Navigate to /login<br>2. Enter valid creds<br>3. Submit | Redirect to /, authenticated |
| U1.1.5 | Login Failure | 1. Enter invalid password<br>2. Submit | Error message shown |
| U1.1.6 | Logout | 1. Click logout<br>2. Verify state | Redirect to /, token cleared |

**Agent Browser Commands**:
```bash
# Example: Test signup flow
agent-browser open http://localhost:5173/signup
agent-browser snapshot -i
agent-browser fill @e1 "test@example.com"
agent-browser fill @e2 "password123"
agent-browser fill @e3 "TestUser"
agent-browser click @e4  # Submit button
agent-browser wait --url "**/"
```

**Success Criteria**:
- ✅ All 6 test cases pass
- ✅ No console errors
- ✅ JWT token stored in localStorage
- ✅ Auth state persists across page reloads

---

### Flow 1.2: Story List Browse

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| U1.2.1 | Load Home Page | 1. Open /<br>2. Wait for load | Hero section + story grid visible |
| U1.2.2 | Filter by Genre | 1. Click genre chip<br>2. Verify filter | Stories filtered by genre |
| U1.2.3 | Search Stories | 1. Type in search<br>2. Wait/debounce | Stories matching search shown |
| U1.2.4 | Sort Stories | 1. Change sort dropdown<br>2. Verify order | Stories re-sorted correctly |
| U1.2.5 | Pagination | 1. Click "Load More"<br>2. Verify new stories | More stories appended |
| U1.2.6 | Story Card Click | 1. Click story card<br>2. Verify navigation | Navigate to /play/{storyId} |

**API Verification**:
```bash
# Verify API is called correctly
curl -s http://localhost:3000/api/v1/stories | jq '.stories | length'  # Should be > 0
```

**Success Criteria**:
- ✅ Stories load from API
- ✅ Filters work (genre, search, sort)
- ✅ Pagination functional
- ✅ Click story navigates to play page

---

### Flow 1.3: Game Session Start

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| U1.3.1 | Navigate to Play | 1. Open /play/{storyId}<br>2. Wait for load | Play page loads with story info |
| U1.3.2 | Start New Session | 1. Click "새 세션 시작"<br>2. Wait for API | Session created, game ready |
| U1.3.3 | Verify Engine State | 1. Check localStorage<br>2. Check messages | Session data persisted |
| U1.3.4 | Model Selection | 1. Select different model<br>2. Start session | Uses selected model |
| U1.3.5 | Invalid Story ID | 1. Open /play/invalid-id<br>2. Check response | Error message or redirect |

**API Verification**:
```bash
# Verify session creation
curl -X POST http://localhost:3000/api/v1/game/start \
  -H "Content-Type: application/json" \
  -d '{"storyId":"valid-id","model":"gemini-2.0-flash"}' | jq '.sessionId'
```

**Success Criteria**:
- ✅ Session created in DB
- ✅ System prompt generated
- ✅ Start message shown
- ✅ Game engine initialized

---

### Flow 1.4: Chat SSE Streaming

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| U1.4.1 | Send Message | 1. Type message<br>2. Click send<br>3. Watch stream | Message appears, AI streams response |
| U1.4.2 | SSE Connection | 1. Monitor network<br>2. Verify SSE stream | Server-Sent Events established |
| U1.4.3 | Message Modes | 1. Try [행동], [대사], [생각]<br>2. Send | Each mode works correctly |
| U1.4.4 | Stop Generation | 1. Start message<br>2. Click stop | Generation halts, partial response shown |
| U1.4.5 | Regenerate | 1. Click regenerate<br>2. Verify new response | Different response generated |
| U1.4.6 | Status Window | 1. Send message<br>2. Parse response | Status block parsed correctly |

**Network Monitoring**:
```bash
# Verify SSE endpoint
agent-browser network requests --type xhr,fetch | grep "chat"
```

**Success Criteria**:
- ✅ SSE connection established
- ✅ Response streams in real-time
- ✅ Status window updates
- ✅ Messages saved to history

---

### Flow 1.5: Session Save/Load

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| U1.5.1 | Auto-save | 1. Start session<br>2. Send message<br>3. Wait 30s | Session saved to localStorage |
| U1.5.2 | Manual Save | 1. Click save<br>2. Check API | Session synced to cloud |
| U1.5.3 | Load Session | 1. Refresh page<br>2. Verify session | Session restored from localStorage |
| U1.5.4 | Memory Load | 1. Check memory API<br>2. Verify data | Session memory loaded |
| U1.5.5 | Cross-tab Sync | 1. Open two tabs<br>2. Send in one | Updates appear in both |

**Storage Verification**:
```bash
# Check localStorage
agent-browser eval 'JSON.stringify(localStorage)'
```

**Success Criteria**:
- ✅ Auto-save works
- ✅ Manual save syncs to API
- ✅ Session restores after refresh
- ✅ Memory loads correctly

---

### Flow 1.6: Profile/API Key Management

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| U1.6.1 | Open Settings | 1. Navigate to /settings<br>2. Verify UI | Settings form visible |
| U1.6.2 | Update Nickname | 1. Change nickname<br>2. Save<br>3. Refresh | Nickname updated |
| U1.6.3 | Add API Key | 1. Enter API key<br>2. Save<br>3. Check response | Key encrypted, stored |
| U1.6.4 | View Masked Key | 1. Go to API key settings<br>2. Check display | Masked key shown |
| U1.6.5 | Delete API Key | 1. Click delete<br>2. Confirm | Key removed from DB |
| U1.6.6 | In-game API Key | 1. Start session<br>2. Enter key in TopBar<br>3. Send message | Key stored in sessionStorage, works |

**Success Criteria**:
- ✅ Profile updates work
- ✅ API key encrypted (AES-256)
- ✅ Masked display works
- ✅ In-game key functions

---

## Phase 2: Admin Flows (7 Flows)

### Flow 2.1: Admin Dashboard

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| A2.1.1 | Navigate to Admin | 1. Navigate to /admin<br>2. Wait for load | Dashboard loads |
| A2.1.2 | Verify Stats | 1. Check story count<br>2. Check session count<br>3. Check user count | Stats match DB |
| A2.1.3 | Recent Events | 1. Check recent events list | Events shown chronologically |
| A2.1.4 | System Health | 1. Check error rate<br>2. Check avg response | Metrics displayed |
| A2.1.5 | Refresh Stats | 1. Wait for auto-refresh<br>2. Verify update | Stats update in real-time |

**API Verification**:
```bash
curl -s http://localhost:3000/api/v1/admin/dashboard | jq '.'
```

**Success Criteria**:
- ✅ Dashboard loads
- ✅ All stats accurate
- ✅ Recent events shown
- ✅ System metrics displayed

---

### Flow 2.2: Story Management

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| A2.2.1 | List All Stories | 1. Navigate to stories tab<br>2. Verify list | All stories shown (incl private) |
| A2.2.2 | Filter Stories | 1. Apply filters<br>2. Verify results | Filter works correctly |
| A2.2.3 | Toggle Featured | 1. Click featured toggle<br>2. Verify API call | Story updated |
| A2.2.4 | Search Stories | 1. Enter search term<br>2. Check results | Matching stories shown |
| A2.2.5 | Pagination | 1. Navigate pages<br>2. Verify data | Correct page shown |

**Success Criteria**:
- ✅ All stories listed
- ✅ Featured toggle works
- ✅ Search/filter functional
- ✅ Pagination works

---

### Flow 2.3: User Management

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| A2.3.1 | List Users | 1. Navigate to users tab<br>2. Verify list | Users shown with roles |
| A2.3.2 | Filter by Role | 1. Select role filter<br>2. Check results | Filtered users shown |
| A2.3.3 | Change User Role | 1. Click role dropdown<br>2. Select new role<br>3. Save | Role updated in DB |
| A2.3.4 | Delete User | 1. Click delete<br>2. Confirm | User removed |
| A2.3.5 | Search Users | 1. Enter search<br>2. Verify results | Matching users shown |

**Success Criteria**:
- ✅ User list loads
- ✅ Role changes work
- ✅ User deletion works
- ✅ Search/filter functional

---

### Flow 2.4: System Settings

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| A2.4.1 | View Prompt Settings | 1. Navigate to prompt settings<br>2. Verify fields | All config fields shown |
| A2.4.2 | Update Prompt Config | 1. Modify config<br>2. Save<br>3. Verify | Config saved to DB |
| A2.4.3 | View Game Params | 1. Navigate to game params<br>2. Verify fields | All params shown |
| A2.4.4 | Update Game Params | 1. Modify params<br>2. Save<br>3. Verify | Params saved to DB |
| A2.4.5 | Cache Invalidation | 1. Update config<br>2. Check cache | Cache invalidated |

**Success Criteria**:
- ✅ Config loads correctly
- ✅ Updates persist to DB
- ✅ Cache invalidates
- ✅ Changes apply immediately

---

### Flow 2.5: Status Presets

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| A2.5.1 | List Presets | 1. Navigate to presets<br>2. Verify list | All presets shown |
| A2.5.2 | Create Preset | 1. Click "New Preset"<br>2. Fill form<br>3. Save | Preset created |
| A2.5.3 | Edit Preset | 1. Click edit<br>2. Modify attributes<br>3. Save | Preset updated |
| A2.5.4 | Delete Preset | 1. Click delete<br>2. Confirm | Preset removed |
| A2.5.5 | Attribute Types | 1. Verify all attribute types<br>2. Test each | All types work (bar, percent, number, text, list) |

**Success Criteria**:
- ✅ Presets CRUD works
- ✅ All attribute types functional
- ✅ Presets apply correctly in editor

---

### Flow 2.6: Service/API Logs

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| A2.6.1 | View Service Logs | 1. Navigate to service logs<br>2. Verify list | Logs shown with filters |
| A2.6.2 | Filter Logs | 1. Apply status filter<br>2. Verify results | Filtered logs shown |
| A2.6.3 | View API Logs | 1. Navigate to API logs<br>2. Verify list | API logs shown |
| A2.6.4 | Filter API Logs | 1. Apply filters<br>2. Verify results | Filtered logs shown |
| A2.6.5 | View Log Detail | 1. Click log entry<br>2. Verify detail | Full detail shown |

**Success Criteria**:
- ✅ Logs load correctly
- ✅ Filters work
- ✅ Detail view shows all data

---

### Flow 2.7: Danger Zone

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| A2.7.1 | Delete Sessions | 1. Click "Delete All Sessions"<br>2. Confirm<br>3. Verify | Sessions table truncated |
| A2.7.2 | Delete Logs | 1. Click "Delete Logs"<br>2. Confirm<br>3. Verify | Logs truncated |
| A2.7.3 | Delete All Data | 1. Click "Delete All"<br>2. Type confirm<br>3. Confirm | All data removed |
| A2.7.4 | Cancel Action | 1. Click delete<br>2. Cancel confirm | No data deleted |

**Success Criteria**:
- ✅ Confirmation dialogs shown
- ✅ Dangerous actions work
- ✅ Cancel works correctly

---

## Phase 3: Editor Flows (4 Flows)

### Flow 3.1: Basic Info Editing

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| E3.1.1 | Create New Story | 1. Navigate to /editor<br>2. Verify form | Blank editor loads |
| E3.1.2 | Edit Existing Story | 1. Open story in editor<br>2. Verify data | Story data loaded |
| E3.1.3 | Select Preset | 1. Click preset dropdown<br>2. Select preset | Fields populate from preset |
| E3.1.4 | Set Genre | 1. Click genre chip<br>2. Verify selection | Genre saved |
| E3.1.5 | Choose Icon | 1. Click icon grid<br>2. Verify selection | Icon saved |
| E3.1.6 | Select Model | 1. Select model dropdown<br>2. Verify choice | Model saved |

**Success Criteria**:
- ✅ Editor loads
- ✅ Presets work
- ✅ All fields save correctly

---

### Flow 3.2: Prompt Settings

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| E3.2.1 | System Rules | 1. Navigate to System Rules<br>2. Edit text<br>3. Save | Rules saved |
| E3.2.2 | World Setting | 1. Navigate to World Setting<br>2. Edit text<br>3. Save | Setting saved |
| E3.2.3 | Story Section | 1. Navigate to Story<br>2. Edit text<br>3. Save | Story saved |
| E3.2.4 | Character Section | 1. Navigate to Character<br>2. Edit text<br>3. Save | Character data saved |
| E3.2.5 | Prompt Preview | 1. Navigate to Preview<br>2. Verify output | Full prompt shown |

**Success Criteria**:
- ✅ All prompt sections save
- ✅ Preview renders correctly
- ✅ Preview updates in real-time

---

### Flow 3.3: Status Window Customization

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| E3.3.1 | Toggle Status Window | 1. Toggle switch<br>2. Verify state | Setting saved |
| E3.3.2 | Quick Preset | 1. Click quick preset<br>2. Verify attributes | Attributes loaded |
| E3.3.3 | Add Attribute | 1. Click "Add"<br>2. Fill form<br>3. Save | Attribute added |
| E3.3.4 | Edit Attribute | 1. Click edit<br>2. Modify<br>3. Save | Attribute updated |
| E3.3.5 | Delete Attribute | 1. Click delete<br>2. Confirm | Attribute removed |
| E3.3.6 | Reorder Attributes | 1. Drag attribute<br>2. Verify order | Order saved |

**Success Criteria**:
- ✅ Status window toggles
- ✅ CRUD operations work
- ✅ Drag-reorder works

---

### Flow 3.4: Output/Publish Settings

**Test Cases**:

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| E3.4.1 | Narrative Length | 1. Adjust slider<br>2. Verify value | Length saved |
| E3.4.2 | LaTeX Toggle | 1. Toggle LaTeX<br>2. Verify state | Setting saved |
| E3.4.3 | Cache Toggle | 1. Toggle cache<br>2. Verify state | Setting saved |
| E3.4.4 | Public/Private | 1. Toggle visibility<br>2. Verify | Visibility saved |
| E3.4.5 | Set Password | 1. Enable password<br>2. Enter password<br>3. Save | Password hashed, saved |
| E3.4.6 | Publish Story | 1. Click publish<br>2. Verify | Story marked public |

**Success Criteria**:
- ✅ All settings save
- ✅ Password hashing works
- ✅ Publish status updates

---

## Test Execution Procedure

### 1. Setup

```bash
# Confirm services are running
curl -s http://localhost:3000/api/health | jq '.status'
curl -s http://localhost:5173 | grep -q "스토리월드"

# Start agent browser
agent-browser open http://localhost:5173
agent-browser wait --load networkidle

# Verify app loaded
agent-browser eval 'document.title'
agent-browser get text body | head -20
```

### 2. Execute Tests by Phase

**Phase 1** (User Flows):
```bash
# Start with unauthenticated flows
agent-browser open http://localhost:5173
# Execute U1.2.1 through U1.2.6

# Then test authentication
agent-browser open http://localhost:5173/signup
# Execute U1.1.1 through U1.1.6

# Then test authenticated flows
agent-browser open http://localhost:5173/play/{storyId}
# Execute U1.3.1 through U1.3.5
# Execute U1.4.1 through U1.4.6
# Execute U1.5.1 through U1.5.5
# Execute U1.6.1 through U1.6.6
```

**Phase 2** (Admin Flows):
```bash
# Login as admin
agent-browser open http://localhost:5173/login
# ... login as admin ...

# Navigate to admin
agent-browser open http://localhost:5173/admin
# Execute A2.1.1 through A2.7.4
```

**Phase 3** (Editor Flows):
```bash
# Open editor
agent-browser open http://localhost:5173/editor
# Execute E3.1.1 through E3.4.6
```

### 3. Document Results

For each test case:
1. **Status**: PASS / FAIL / BLOCKED
2. **Screenshot**: Take screenshot on failure
3. **Console Errors**: Capture any errors
4. **Network**: Verify API calls
5. **Bug Report**: Create subtask for each bug found

```bash
# Example: Document failure
agent-browser screenshot failure-U1.1.3.png
agent-browser eval 'copy(JSON.stringify(performance.entries))'
```

### 4. Report Summary

After completing all tests:

```bash
# Update AI-82 with results
curl -X PATCH "$PAPERCLIP_API_URL/api/issues/82585ba3-b358-4684-b610-7dbead9a7d3e" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -d '{
    "status": "done",
    "comment": "## Test Results Summary\n\n- **Total Tests**: 85\n- **Passed**: 78\n- **Failed**: 5\n- **Blocked**: 2\n\nSee detailed report: docs/qa-test-results-ai82.md"
  }'
```

---

## Success Criteria

### Phase Complete When:

- ✅ All test cases in phase executed
- ✅ Screenshots captured for all failures
- ✅ Bugs documented as subtasks
- ✅ API calls verified
- ✅ No critical blockers remain

### Overall Complete When:

- ✅ All 3 phases complete (User, Admin, Editor)
- ✅ 85+ test cases executed
- ✅ All bugs documented
- ✅ Test report generated
- ✅ AI-82 marked as "done"

---

## Notes

- **Take screenshots** of every failure for bug reports
- **Check browser console** for JavaScript errors after each flow
- **Verify API responses** using backend logs or direct curl calls
- **Test both happy path and edge cases**
- **Document any workarounds** found during testing
- **Report UI/UX issues** even if functional (as separate bugs)

---

**End of Test Execution Plan**

Next step: Wait for CTO to fix `frontend/src/pages/Play.tsx` syntax error, then execute this plan.
