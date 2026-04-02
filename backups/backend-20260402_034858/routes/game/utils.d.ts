import type { FastifyInstance, FastifyRequest } from 'fastify';
/**
 * API 키 해석: 헤더 직접 전달 또는 로그인 사용자의 DB 저장 키 복호화
 */
export declare function resolveApiKey(app: FastifyInstance, request: FastifyRequest): Promise<string | null>;
