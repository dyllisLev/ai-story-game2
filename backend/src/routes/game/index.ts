// backend/src/routes/game/index.ts
import type { FastifyInstance } from 'fastify';
import startRoute from './start.js';
import chatRoute from './chat.js';

export default async function gameRoutes(app: FastifyInstance) {
  await app.register(startRoute);
  await app.register(chatRoute);
}
