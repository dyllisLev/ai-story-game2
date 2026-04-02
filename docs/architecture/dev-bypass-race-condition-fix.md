# Dev Bypass Race Condition Fix — Architecture Document

**Issue:** AI-189
**Date:** 2026-04-02
**Architect:** Software Architect

## Problem Summary

Multiple critical bugs (AI-172, AI-176, AI-180, AI-181, AI-182) were caused by architectural issues in the dev bypass header management:

1. **Race Condition**: Headers were read from localStorage at request construction time
2. **State Inconsistency**: localStorage could change mid-request
3. **No Type Safety**: String concatenation for headers
4. **Missing Context**: No centralized state management

## Architectural Solution

### 1. Centralized Dev Bypass Manager (Singleton Pattern)

**File:** `frontend/src/lib/dev-bypass.ts`

**Key Design Decisions:**
- **Singleton Pattern**: Ensures single source of truth for dev bypass state
- **Event-Based Updates**: Listeners are notified when state changes, eliminating race conditions
- **Type-Safe Constants**: All header keys and values are typed constants
- **Graceful Degradation**: Handles localStorage unavailability (e.g., private browsing)

**Architecture:**
```typescript
class DevBypassManager {
  private state: DevBypassState { enabled, lastUpdated }
  private listeners: Set<DevBypassListener>

  // Public API
  update(): void                          // Re-read from localStorage
  getHeaders(): Record<string, string>    // Get headers for API requests
  isEnabled(): boolean                    // Check if bypass is active
  subscribe(listener): () => void         // Subscribe to state changes
}
```

**Benefits:**
- No race conditions: State is cached in memory, not read per request
- Consistent state: All API calls use the same state snapshot
- Testable: Singleton can be reset between tests
- Observable: Components can subscribe to state changes

### 2. Request Interceptor Pattern

**File:** `frontend/src/lib/api.ts`

**Key Design Decisions:**
- **Single Point of Entry**: All API requests go through the `request()` function
- **Consistent Header Attachment**: Headers are attached at request time, not earlier
- **Immutable Header Objects**: New objects created each time to prevent mutation

**Architecture:**
```typescript
async function request<T>(path, options) {
  const headers = {};

  // 1. Content-Type (if body exists)
  if (options.body) headers['Content-Type'] = 'application/json';

  // 2. Dev bypass headers (from centralized manager)
  const devBypassHeaders = getDevBypassHeaders();
  Object.assign(headers, devBypassHeaders);

  // 3. Custom headers (from caller)
  if (options.headers) Object.assign(headers, options.headers);

  // 4. Make request
  return fetch(url, { method, body, headers });
}
```

**Benefits:**
- No race conditions: Headers read from cached state, not localStorage
- Consistent: All API calls use the same header attachment logic
- Type-safe: Header keys and values are typed constants

### 3. Comprehensive Testing

**Unit Tests:** `frontend/src/lib/dev-bypass.test.ts` (18 tests, 100% passing)

Test coverage:
- **Initialization**: Bypass enabled/disabled states
- **State Updates**: Enable/disable transitions
- **Header Generation**: Correct headers returned
- **Mutation Safety**: Header objects cannot affect internal state
- **State Change Notifications**: Listener subscription/unsubscription
- **Error Handling**: Listener errors don't crash the system
- **Backward Compatibility**: Supports old and new localStorage keys
- **State Immutability**: Internal state protected from external mutation

**E2E Tests:** `e2e/tests/admin/test-service-logs-race-condition.spec.ts`
- Tests the specific race condition scenario (AI-177)
- Verifies no 401 errors after auth skip
- Verifies content loads successfully

## Implementation Checklist

✅ **Centralized Dev Bypass Manager**
- [x] Singleton pattern implementation
- [x] Type-safe state management
- [x] Event-based update notifications
- [x] Graceful error handling

✅ **API Client Integration**
- [x] Updated `api.ts` to use centralized manager
- [x] Consistent header attachment
- [x] Immutable header objects

✅ **Testing Infrastructure**
- [x] Vitest configured for frontend
- [x] Unit tests written (18 tests)
- [x] All tests passing (100%)
- [x] E2E tests for race condition scenarios

✅ **Documentation**
- [x] Architecture document
- [x] Code comments explaining design decisions
- [x] Test documentation

## Performance Characteristics

- **Memory**: Minimal (~100 bytes for singleton state)
- **CPU**: Negligible (one localStorage read on init, updates only on state change)
- **Network**: No additional requests
- **Race Conditions**: Eliminated (state cached in memory)

## Migration Notes

- **Backward Compatible**: Old localStorage key `devAdminBypass` still supported
- **No Breaking Changes**: Existing components continue to work
- **Drop-in Replacement**: Simply import from `lib/dev-bypass` instead of reading localStorage directly

## Related Issues Resolved

- [AI-172] 관리자페이지 서비스로그 메뉴클릭시 오류
- [AI-176] 개발자 우회 모드에서도 대시보드 API 401 오류
- [AI-180] 관리자페이지 서비스 로그 메뉴 클릭 시 빈 화면 표시
- [AI-181] Service Logs 401 Error - Race Condition
- [AI-182] 서비스 로그 페이지 dev bypass 헤더 불일치

## Future Improvements

**Potential Enhancements:**
1. **React Context Provider**: For easier use in React components
2. **Persistence Layer**: Abstraction for localStorage vs sessionStorage
3. **Debug Mode**: Toggle for verbose logging
4. **Metrics**: Track how often bypass is used

**Not in Scope:**
- No auth bypass in production (localStorage check already in place)
- No backend changes (this is purely frontend architecture)

## Conclusion

This architectural solution eliminates the race condition by:
1. Caching dev bypass state in memory (singleton)
2. Reading headers from cached state (not localStorage)
3. Ensuring consistent state across all API calls

The solution is:
- **Testable**: 18 unit tests verify correctness
- **Maintainable**: Clear separation of concerns
- **Performant**: Minimal overhead
- **Safe**: Graceful error handling throughout
