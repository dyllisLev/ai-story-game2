import listRoute from './list.js';
import detailRoute from './detail.js';
import crudRoute from './crud.js';
import memoryRoute from './memory.js';
export default async function sessionsRoutes(app) {
    await app.register(listRoute);
    await app.register(detailRoute);
    await app.register(crudRoute);
    await app.register(memoryRoute);
}
//# sourceMappingURL=index.js.map