import { API_V1_PREFIX } from '../constants.js';
// Stories
import storiesListRoute from './stories/list.js';
import storiesDetailRoute from './stories/detail.js';
import storiesCrudRoute from './stories/crud.js';
import storiesStatsRoute from './stories/stats.js';
import storiesMineRoute from './stories/mine.js';
import presetsRoute from './stories/presets.js';
// Admin
import adminStoriesRoute from './admin/stories.js';
import adminStatusPresetsRoute from './admin/status-presets.js';
import adminServiceLogsRoute from './admin/service-logs.js';
import adminApiLogsRoute from './admin/api-logs.js';
import adminDashboardRoute from './admin/dashboard.js';
import adminDangerZoneRoute from './admin/danger-zone.js';
import adminUsersRoute from './admin/users.js';
import adminVerifyRoute from './admin/verify.js';
export async function registerRoutes(app) {
    // --- Public stories ---
    // Note: stats and mine must register BEFORE detail to avoid /:id matching
    await app.register(storiesStatsRoute, { prefix: API_V1_PREFIX });
    await app.register(storiesListRoute, { prefix: API_V1_PREFIX });
    await app.register(storiesMineRoute, { prefix: API_V1_PREFIX });
    await app.register(storiesDetailRoute, { prefix: API_V1_PREFIX });
    await app.register(storiesCrudRoute, { prefix: API_V1_PREFIX });
    await app.register(presetsRoute, { prefix: API_V1_PREFIX });
    // --- Admin (all protected by requireAdmin inside each route) ---
    await app.register(adminStoriesRoute, { prefix: API_V1_PREFIX });
    await app.register(adminStatusPresetsRoute, { prefix: API_V1_PREFIX });
    await app.register(adminServiceLogsRoute, { prefix: API_V1_PREFIX });
    await app.register(adminApiLogsRoute, { prefix: API_V1_PREFIX });
    await app.register(adminDashboardRoute, { prefix: API_V1_PREFIX });
    await app.register(adminDangerZoneRoute, { prefix: API_V1_PREFIX });
    await app.register(adminUsersRoute, { prefix: API_V1_PREFIX });
    await app.register(adminVerifyRoute, { prefix: API_V1_PREFIX });
}
//# sourceMappingURL=index.js.map