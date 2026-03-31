// backend/src/routes/index.ts
// Central route registration — import and register all Phase 2-B routes here.
// This file is imported by server.ts.
import type { FastifyInstance } from 'fastify';

// Stories
import storiesListRoute   from './stories/list.js';
import storiesDetailRoute from './stories/detail.js';
import storiesCrudRoute   from './stories/crud.js';
import storiesStatsRoute  from './stories/stats.js';
import presetsRoute       from './stories/presets.js';

// Admin
import adminStoriesRoute       from './admin/stories.js';
import adminStatusPresetsRoute from './admin/status-presets.js';
import adminServiceLogsRoute   from './admin/service-logs.js';
import adminApiLogsRoute       from './admin/api-logs.js';
import adminDashboardRoute     from './admin/dashboard.js';
import adminDangerZoneRoute    from './admin/danger-zone.js';
import adminUsersRoute         from './admin/users.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // --- Public stories ---
  // Note: stats must register BEFORE detail to avoid /:id matching "stats"
  await app.register(storiesStatsRoute);
  await app.register(storiesListRoute);
  await app.register(storiesDetailRoute);
  await app.register(storiesCrudRoute);
  await app.register(presetsRoute);

  // --- Admin (all protected by requireAdmin inside each route) ---
  await app.register(adminStoriesRoute);
  await app.register(adminStatusPresetsRoute);
  await app.register(adminServiceLogsRoute);
  await app.register(adminApiLogsRoute);
  await app.register(adminDashboardRoute);
  await app.register(adminDangerZoneRoute);
  await app.register(adminUsersRoute);
}
