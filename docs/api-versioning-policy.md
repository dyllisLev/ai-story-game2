# API Versioning Policy

## Overview

The AI Story Game API uses versioned endpoints to prevent breaking changes from affecting existing clients. This policy defines how API versions are managed, deprecated, and migrated.

## Current Version Structure

### API v1 (Current)
- **Base URL:** `/api/v1`
- **Status:** Active
- **Released:** 2026-04-01
- **Deprecation:** Not scheduled

### Unversioned Endpoints
The following endpoints remain unversioned:
- **Health Check:** `/api/health` - Monitoring and uptime checks

## Versioning Strategy

### URL-Based Versioning
All API endpoints use URL path versioning:
```
/api/v1/stories
/api/v1/sessions
/api/v1/auth/login
```

### Breaking Changes
A change is considered "breaking" if it:
- Removes or renames fields
- Changes field data types
- Modifies request/response structure
- Changes authentication requirements
- Alters error response formats
- Modifies HTTP method semantics

### Non-Breaking Changes
The following changes are made within the same version:
- Adding new optional fields
- Adding new endpoints
- Adding new query parameters
- Bug fixes that maintain behavior
- Performance improvements
- Documentation updates

## Deprecation Policy

### Deprecation Process

1. **Announcement** (6-12 months before deprecation)
   - Release blog post
   - Update API documentation with deprecation notice
   - Add `X-API-Deprecated` and `Sunset` headers to deprecated endpoints
   - Email notifications to registered API users

2. **Grace Period** (6-12 months)
   - Both old and new versions remain functional
   - Migration guide and support provided
   - Regular reminders sent to API users

3. **Deprecation Date**
   - Old version endpoints return `410 Gone`
   - Documentation for old version moved to archive
   - Support discontinued

### API Deprecation Headers

Deprecated endpoints include these HTTP headers:
```
X-API-Deprecated: true
Deprecation: true
Sunset: Wed, 01 Apr 2027 00:00:00 GMT
Link: </api/v2/stories>; rel="successor-version"
```

## Version Lifecycle

| Stage | Duration | Description |
|-------|----------|-------------|
| **Active** | Indefinite | Current stable version, new features added |
| **Maintenance** | 6-12 months | No new features, bug fixes only |
| **Deprecated** | 6-12 months | Warning headers, migration encouraged |
| **Sunset** | - | Endpoints return `410 Gone` |

## Migration Guide

### Upgrading to API v1

If you were using the unversioned API (before 2026-04-01), update your base URL:

**Before:**
```
const API_BASE = '/api';
```

**After:**
```
const API_BASE = '/api/v1';
```

**Note:** The unversioned API was deprecated immediately on 2026-04-01 as part of the API versioning implementation.

### Future Version Upgrades

When a new API version is released:

1. **Review the changelog** for breaking changes
2. **Update your base URL** to the new version
3. **Test in development** before deploying to production
4. **Migrate during the deprecation window** to avoid disruption

## Best Practices

### For API Consumers

1. **Pin to a specific version** in your application
2. **Watch for deprecation headers** in API responses
3. **Subscribe to updates** for version announcements
4. **Test migrations** in development environment
5. **Plan migrations** during the maintenance window

### For API Developers

1. **Minimize breaking changes** - prefer extending over modifying
2. **Provide clear migration guides** with code examples
3. **Use deprecation headers** well in advance
4. **Maintain old versions** during deprecation period
5. **Document all changes** in changelog

## Current API Endpoints (v1)

### Stories
- `GET /api/v1/stories` - List stories
- `GET /api/v1/stories/stats` - Story statistics
- `GET /api/v1/stories/mine` - My stories
- `GET /api/v1/stories/:id` - Story detail
- `POST /api/v1/stories` - Create story
- `PUT /api/v1/stories/:id` - Update story
- `DELETE /api/v1/stories/:id` - Delete story
- `GET /api/v1/stories/presets` - Story presets

### Sessions
- `GET /api/v1/sessions` - List sessions
- `GET /api/v1/sessions/:id` - Session detail
- `POST /api/v1/sessions` - Create session
- `PUT /api/v1/sessions/:id` - Update session
- `DELETE /api/v1/sessions/:id` - Delete session
- `GET /api/v1/sessions/:id/memory` - Session memory

### Game
- `POST /api/v1/game/start` - Start game
- `POST /api/v1/game/chat` - Send chat message (SSE)

### Auth
- `POST /api/v1/auth/signup` - Sign up
- `POST /api/v1/auth/login` - Log in
- `POST /api/v1/auth/logout` - Log out
- `POST /api/v1/auth/refresh` - Refresh token

### User
- `GET /api/v1/me` - Current user
- `PUT /api/v1/me` - Update profile
- `PUT /api/v1/me/apikey` - Update API key

### Config
- `GET /api/v1/config` - Get config
- `PUT /api/v1/config` - Update config (admin)

### Admin
- `GET /api/v1/admin/dashboard` - Dashboard stats
- `GET /api/v1/admin/stories` - Manage stories
- `GET /api/v1/admin/status-presets` - Status presets
- `GET /api/v1/admin/service-logs` - Service logs
- `GET /api/v1/admin/api-logs` - API logs
- `POST /api/v1/admin/danger-zone` - Danger zone operations

## Support

For questions about API versioning or migration assistance:
- Check the documentation in `/docs/`
- Review architectural state in `/memory/`
- Contact the development team

## Version History

| Version | Release Date | Status | Notes |
|---------|--------------|--------|-------|
| v1 | 2026-04-01 | Active | Initial versioned API release |
| unversioned | - | Deprecated | Replaced by v1 |

---

**Last Updated:** 2026-04-01
**Policy Version:** 1.0
