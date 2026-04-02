// Standard error codes
export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["CONFLICT"] = "CONFLICT";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
})(ErrorCode || (ErrorCode = {}));
// Log error with context
export function logError(app, context, error, details) {
    const errorInfo = {
        context,
        error: error instanceof Error ? error.message : String(error),
        ...(details ?? {}),
    };
    app.log.error(errorInfo, `${context}: ${error instanceof Error ? error.message : String(error)}`);
}
// Send standardized error response
export function sendError(reply, code, message, status = 400, details) {
    const errorResponse = {
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
    validationError: (reply, message, details) => sendError(reply, ErrorCode.VALIDATION_ERROR, message, 400, details),
    unauthorized: (reply, message = '인증이 필요합니다') => sendError(reply, ErrorCode.UNAUTHORIZED, message, 401),
    forbidden: (reply, message = '접근 권한이 없습니다') => sendError(reply, ErrorCode.FORBIDDEN, message, 403),
    notFound: (reply, message = '리소스를 찾을 수 없습니다') => sendError(reply, ErrorCode.NOT_FOUND, message, 404),
    conflict: (reply, message) => sendError(reply, ErrorCode.CONFLICT, message, 409),
    internalError: (reply, message = '서버 오류가 발생했습니다') => sendError(reply, ErrorCode.INTERNAL_ERROR, message, 500),
    serviceUnavailable: (reply, message = '서비스를 사용할 수 없습니다') => sendError(reply, ErrorCode.SERVICE_UNAVAILABLE, message, 503),
};
// Handle Supabase errors with standardized responses
export function handleSupabaseError(app, reply, context, error, customMessage) {
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
//# sourceMappingURL=error-handler.js.map