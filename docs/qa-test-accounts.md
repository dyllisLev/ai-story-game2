# QA Test Accounts

> **Created:** 2026-04-01
> **Purpose:** QA 테스트를 위한 관리자 및 사용자 계정
> **Maintained by:** QA Engineer (f357226d-9584-4675-aa21-1127ac275f18)

## ⚠️ Security Notice

**These are TEST accounts only. Never use these credentials in production.**

## Admin Account

| Field | Value |
|-------|-------|
| **Email** | `qa-admin@test.com` |
| **Password** | `AdminPass123` |
| **Role** | `admin` |
| **User ID** | `52e0cd82-394d-4ad8-959e-8d63c60bdde5` |
| **Nickname** | (not set) |
| **Access** | Full admin panel access at `/admin` |

## Regular User Accounts

### User 1 - 테스터1

| Field | Value |
|-------|-------|
| **Email** | `qa-user1@test.com` |
| **Password** | `UserPass123` |
| **Role** | `pending` |
| **User ID** | `5cfcf8de-776e-4200-ae11-23ef946d4c92` |
| **Nickname** | `테스터1` |
| **Access** | Standard user features |

### User 2 - 테스터2

| Field | Value |
|-------|-------|
| **Email** | `qa-user2@test.com` |
| **Password** | `UserPass123` |
| **Role** | `pending` |
| **User ID** | `d7871889-2013-4519-9bf8-eb6ff3d045e8` |
| **Nickname** | `테스터2` |
| **Access** | Standard user features |

### User 3 - 테스터3

| Field | Value |
|-------|-------|
| **Email** | `qa-user3@test.com` |
| **Password** | `UserPass123` |
| **Role** | `pending` |
| **User ID** | `de133c1c-b4f6-4ef8-8b3e-7f15a1ed250f` |
| **Nickname** | `테스터3` |
| **Access** | Standard user features |

## Usage Guidelines

### For E2E Testing

1. **Admin Testing**: Use `qa-admin@test.com` for admin panel features
2. **User Testing**: Use `qa-user1@test.com`, `qa-user2@test.com`, or `qa-user3@test.com` for standard user features
3. **Multi-user Scenarios**: Use multiple accounts simultaneously for concurrent user testing

### For Manual Testing

1. Navigate to http://localhost:5173/login
2. Use credentials from above
3. Test specific features based on account role

### For API Testing

```bash
# Login as admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"qa-admin@test.com","password":"AdminPass123"}'

# Login as regular user
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"qa-user1@test.com","password":"UserPass123"}'
```

## Account Maintenance

### Resetting Passwords

If passwords need to be reset, use the Supabase dashboard or create new accounts via:

```bash
# Create new admin
npx tsx backend/scripts/create-admin.ts <email> <password>

# Create new regular user (via API)
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"<email>","password":"<password>","nickname":"<nickname>"}'
```

### Cleanup

To remove test accounts:

1. **Via Supabase Dashboard**: Go to Authentication > Users
2. **Via API**: Delete user (requires admin privileges)

## Test Account States

- **Creation Date**: 2026-04-01
- **Last Verified**: 2026-04-01 07:45 UTC
- **Status**: ✅ Active - All accounts verified and working
- **Email Verification**: All accounts have verified emails
- **Login Test**: ✅ Admin and user logins successful

### Verification Results

- ✅ Admin account login successful (role: admin)
- ✅ Regular user login successful (role: user)
- ✅ All accounts can authenticate via API
- ✅ Admin has admin panel access
- ✅ Regular users have standard user access

## Related Documentation

- [E2E Testing](../../e2e/README.md) - E2E test documentation
- [API Documentation](../api-versioning-policy.md) - API versioning and endpoints
- [Test Cases](https://docs.google.com/spreadsheets/d/1vXwfGaAxOy4iE8Yxz1oiN4_osW77tmzkkB7E2U8ze0c/edit) - Test case spreadsheet

---

**Note:** This file should be kept secure and not committed to public repositories. Update this file when accounts are created, modified, or removed.
