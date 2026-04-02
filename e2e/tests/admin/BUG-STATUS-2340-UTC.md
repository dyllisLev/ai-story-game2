# 건너뛰기 버튼 버그 상태 - 수정되지 않음
**테스트 시간:** 2026-04-01 23:40 UTC
**상태:** 🔴 버그 여전히 존재

## 테스트 결과

### 브라우저 자동화 테스트
1. `http://localhost:5173/admin` 접속
2. "로그인이 필요합니다" 화면 확인
3. "건너뛰기 (Dev)" 버튼 클릭
4. **결과:** "관리자 권한 확인에 실패했습니다" 화면 표시
5. 다시 "건너뛰기 (Dev)" 버튼 표시됨
6. 클릭 → 4번 단계로 되돌아감
7. **무한 루프 확인** ❌

## 원인 코드 (수정되지 않음)

**위치:** `frontend/src/pages/Admin.tsx` 185-203줄

```tsx
useEffect(() => {
  if (!user) return;

  const verifyAdmin = async () => {
    try {
      const response = await api.get('/admin/verify');
      setServerVerified(response.isAdmin); // ← false로 설정됨
    } catch (err) {
      setServerVerified(false);
    }
  };

  verifyAdmin();
}, [user]); // ← setMockAdminUser() 후 재실행되어 무한 루프 생성
```

## 문제점

1. 건너뛰기 버튼 클릭 → `setMockAdminUser()` 호출
2. `useEffect([user])`가 사용자 변경 감지
3. `/api/admin/verify` 호출 (mock 사용자는 실제 Supabase JWT 없음)
4. 서버 검증 실패 → `setServerVerified(false)`
5. 오류 화면 표시 + 다시 건너뛰기 버튼
6. **무한 루프**

## 필요한 수정

```tsx
useEffect(() => {
  if (!user) return;

  // DEV 모드에서 mock admin 우회
  if (import.meta.env.DEV && user.id === 'dev-admin-user') {
    setServerVerified(true);
    return; // /admin/verify 호출하지 않음
  }

  // 기존 검증 코드
  const verifyAdmin = async () => {
    // ...
  };
  verifyAdmin();
}, [user]);
```

## QA 엔지니어 결론

- ✅ 버그 발견 및 문서화
- ✅ 브라우저 자동화로 증거 확보
- ✅ 원인 코드 분석
- ❌ 수정되지 않음 (코드 확인 완료)
- ❌ E2E 테스트 불가

**CTO 요청:** 실제 버그가 수정되어야 E2E 테스트 진행 가능.
