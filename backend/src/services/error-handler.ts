// backend/src/services/error-handler.ts
// Standardized error handling utility for API endpoints
import type { FastifyInstance, FastifyReply } from 'fastify';

// Standard error codes
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// Error response interface
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

// Log error with context
export function logError(
  app: FastifyInstance,
  context: string,
  error: unknown,
  details?: Record<string, unknown>
): void {
  const errorInfo = {
    context,
    error: error instanceof Error ? error.message : String(error),
    ...(details ?? {}),
  };
  app.log.error(errorInfo, `${context}: ${error instanceof Error ? error.message : String(error)}`);
}

// Send standardized error response
export function sendError(
  reply: FastifyReply,
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: unknown
): FastifyReply {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  return reply.status(status).send(errorResponse);
}

// Common error response helpers
export const ErrorHelpers = {
  validationError: (reply: FastifyReply, message: string, details?: unknown) =>
    sendError(reply, ErrorCode.VALIDATION_ERROR, message, 400, details),

  unauthorized: (reply: FastifyReply, message: string = '인증이 필요합니다') =>
    sendError(reply, ErrorCode.UNAUTHORIZED, message, 401),

  forbidden: (reply: FastifyReply, message: string = '접근 권한이 없습니다') =>
    sendError(reply, ErrorCode.FORBIDDEN, message, 403),

  notFound: (reply: FastifyReply, message: string = '리소스를 찾을 수 없습니다') =>
    sendError(reply, ErrorCode.NOT_FOUND, message, 404),

  conflict: (reply: FastifyReply, message: string) =>
    sendError(reply, ErrorCode.CONFLICT, message, 409),

  internalError: (reply: FastifyReply, message: string = '서버 오류가 발생했습니다') =>
    sendError(reply, ErrorCode.INTERNAL_ERROR, message, 500),

  serviceUnavailable: (reply: FastifyReply, message: string = '서비스를 사용할 수 없습니다') =>
    sendError(reply, ErrorCode.SERVICE_UNAVAILABLE, message, 503),
};

// Handle Supabase errors with standardized responses
export function handleSupabaseError(
  app: FastifyInstance,
  reply: FastifyReply,
  context: string,
  error: { message?: string; code?: string; details?: unknown },
  customMessage?: string
): FastifyReply {
  logError(app, context, error);

  // Map common Supabase error codes to our standard codes
  const supabaseCode = error.code;
  if (supabaseCode === 'PGRST116') {
    return ErrorHelpers.notFound(reply, customMessage ?? '리소스를 찾을 수 없습니다');
  }
  if (supabaseCode === 'PGRST204') {
    return ErrorHelpers.validationError(reply, customMessage ?? '잘못된 요청입니다');
  }
  if (supabaseCode === '23505') {
    return ErrorHelpers.conflict(reply, customMessage ?? '이미 존재하는 데이터입니다');
  }

  // Default to internal error
  return ErrorHelpers.internalError(reply, customMessage);
}
