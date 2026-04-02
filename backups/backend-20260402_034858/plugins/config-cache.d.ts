import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '@story-game/shared';
declare module 'fastify' {
    interface FastifyInstance {
        getAppConfig: () => Promise<AppConfig>;
        invalidateConfigCache: () => void;
    }
}
declare const _default: (app: FastifyInstance) => Promise<void>;
export default _default;
