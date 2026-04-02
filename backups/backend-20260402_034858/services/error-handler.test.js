// Tests for error-handler utilities
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorCode, logError, sendError, ErrorHelpers, handleSupabaseError, } from './error-handler.js';
// Create mock reply
function createMockReply() {
    const reply = {};
    reply.status = vi.fn((code) => reply);
    reply.send = vi.fn((data) => reply);
    return reply;
}
// Create mock app
function createMockApp() {
    return {
        log: {
            error: vi.fn(),
        },
    };
}
describe('Error Handler Service', () => {
    let mockReply;
    let mockApp;
    beforeEach(() => {
        mockReply = createMockReply();
        mockApp = createMockApp();
        vi.clearAllMocks();
    });
    describe('ErrorCode enum', () => {
        it('should have all expected error codes', () => {
            expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
            expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
            expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
            expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
            expect(ErrorCode.CONFLICT).toBe('CONFLICT');
            expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
            expect(ErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
        });
    });
    describe('sendError', () => {
        it('should send error response with correct format', () => {
            sendError(mockReply, ErrorCode.VALIDATION_ERROR, 'Test error', 400);
            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: 'Test error',
                },
            });
        });
        it('should include details when provided', () => {
            const details = { field: 'email', reason: 'Invalid format' };
            sendError(mockReply, ErrorCode.VALIDATION_ERROR, 'Test error', 400, details);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: 'Test error',
                    details,
                },
            });
        });
        it('should default to status 400', () => {
            sendError(mockReply, ErrorCode.VALIDATION_ERROR, 'Test error');
            expect(mockReply.status).toHaveBeenCalledWith(400);
        });
        it('should use provided status code', () => {
            sendError(mockReply, ErrorCode.NOT_FOUND, 'Not found', 404);
            expect(mockReply.status).toHaveBeenCalledWith(404);
        });
        it('should return reply for chaining', () => {
            const result = sendError(mockReply, ErrorCode.VALIDATION_ERROR, 'Test error', 400);
            expect(result).toBe(mockReply);
        });
    });
    describe('logError', () => {
        it('should log error with context', () => {
            const error = new Error('Test error');
            logError(mockApp, 'test_context', error);
            expect(mockApp.log.error).toHaveBeenCalledWith({
                context: 'test_context',
                error: 'Test error',
            }, 'test_context: Test error');
        });
        it('should log string errors', () => {
            logError(mockApp, 'test_context', 'String error message');
            expect(mockApp.log.error).toHaveBeenCalledWith({
                context: 'test_context',
                error: 'String error message',
            }, 'test_context: String error message');
        });
        it('should include additional details', () => {
            const error = new Error('Test error');
            logError(mockApp, 'test_context', error, { userId: '123', action: 'delete' });
            expect(mockApp.log.error).toHaveBeenCalledWith({
                context: 'test_context',
                error: 'Test error',
                userId: '123',
                action: 'delete',
            }, 'test_context: Test error');
        });
        it('should handle non-error objects', () => {
            logError(mockApp, 'test_context', { custom: 'error object' });
            expect(mockApp.log.error).toHaveBeenCalledWith({
                context: 'test_context',
                error: '[object Object]',
            }, 'test_context: [object Object]');
        });
    });
    describe('ErrorHelpers', () => {
        describe('validationError', () => {
            it('should send validation error with status 400', () => {
                ErrorHelpers.validationError(mockReply, 'Invalid input');
                expect(mockReply.status).toHaveBeenCalledWith(400);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        message: 'Invalid input',
                    },
                });
            });
            it('should include details when provided', () => {
                const details = { fields: ['email', 'password'] };
                ErrorHelpers.validationError(mockReply, 'Invalid input', details);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.VALIDATION_ERROR,
                        message: 'Invalid input',
                        details,
                    },
                });
            });
        });
        describe('unauthorized', () => {
            it('should send unauthorized error with status 401', () => {
                ErrorHelpers.unauthorized(mockReply, 'Please login');
                expect(mockReply.status).toHaveBeenCalledWith(401);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.UNAUTHORIZED,
                        message: 'Please login',
                    },
                });
            });
            it('should use default message when not provided', () => {
                ErrorHelpers.unauthorized(mockReply);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.UNAUTHORIZED,
                        message: '인증이 필요합니다',
                    },
                });
            });
        });
        describe('forbidden', () => {
            it('should send forbidden error with status 403', () => {
                ErrorHelpers.forbidden(mockReply, 'Access denied');
                expect(mockReply.status).toHaveBeenCalledWith(403);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.FORBIDDEN,
                        message: 'Access denied',
                    },
                });
            });
            it('should use default message when not provided', () => {
                ErrorHelpers.forbidden(mockReply);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.FORBIDDEN,
                        message: '접근 권한이 없습니다',
                    },
                });
            });
        });
        describe('notFound', () => {
            it('should send not found error with status 404', () => {
                ErrorHelpers.notFound(mockReply, 'Story not found');
                expect(mockReply.status).toHaveBeenCalledWith(404);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.NOT_FOUND,
                        message: 'Story not found',
                    },
                });
            });
            it('should use default message when not provided', () => {
                ErrorHelpers.notFound(mockReply);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.NOT_FOUND,
                        message: '리소스를 찾을 수 없습니다',
                    },
                });
            });
        });
        describe('conflict', () => {
            it('should send conflict error with status 409', () => {
                ErrorHelpers.conflict(mockReply, 'Email already exists');
                expect(mockReply.status).toHaveBeenCalledWith(409);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.CONFLICT,
                        message: 'Email already exists',
                    },
                });
            });
        });
        describe('internalError', () => {
            it('should send internal error with status 500', () => {
                ErrorHelpers.internalError(mockReply, 'Database connection failed');
                expect(mockReply.status).toHaveBeenCalledWith(500);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.INTERNAL_ERROR,
                        message: 'Database connection failed',
                    },
                });
            });
            it('should use default message when not provided', () => {
                ErrorHelpers.internalError(mockReply);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.INTERNAL_ERROR,
                        message: '서버 오류가 발생했습니다',
                    },
                });
            });
        });
        describe('serviceUnavailable', () => {
            it('should send service unavailable error with status 503', () => {
                ErrorHelpers.serviceUnavailable(mockReply, 'Maintenance mode');
                expect(mockReply.status).toHaveBeenCalledWith(503);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.SERVICE_UNAVAILABLE,
                        message: 'Maintenance mode',
                    },
                });
            });
            it('should use default message when not provided', () => {
                ErrorHelpers.serviceUnavailable(mockReply);
                expect(mockReply.send).toHaveBeenCalledWith({
                    error: {
                        code: ErrorCode.SERVICE_UNAVAILABLE,
                        message: '서비스를 사용할 수 없습니다',
                    },
                });
            });
        });
    });
    describe('handleSupabaseError', () => {
        it('should log the error', () => {
            const error = { code: 'PGRST116', message: 'Not found' };
            handleSupabaseError(mockApp, mockReply, 'test_context', error);
            expect(mockApp.log.error).toHaveBeenCalled();
        });
        it('should handle PGRST116 as not found', () => {
            const error = { code: 'PGRST116', message: 'Resource not found' };
            handleSupabaseError(mockApp, mockReply, 'stories', error);
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: {
                    code: ErrorCode.NOT_FOUND,
                    message: '리소스를 찾을 수 없습니다',
                },
            });
        });
        it('should handle PGRST116 with custom message', () => {
            const error = { code: 'PGRST116' };
            handleSupabaseError(mockApp, mockReply, 'stories', error, '스토리를 찾을 수 없습니다');
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: {
                    code: ErrorCode.NOT_FOUND,
                    message: '스토리를 찾을 수 없습니다',
                },
            });
        });
        it('should handle PGRST204 as validation error', () => {
            const error = { code: 'PGRST204', message: 'Invalid request' };
            handleSupabaseError(mockApp, mockReply, 'stories', error);
            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: {
                    code: ErrorCode.VALIDATION_ERROR,
                    message: '잘못된 요청입니다',
                },
            });
        });
        it('should handle 23505 as conflict', () => {
            const error = { code: '23505', message: 'Duplicate key' };
            handleSupabaseError(mockApp, mockReply, 'users', error);
            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: {
                    code: ErrorCode.CONFLICT,
                    message: '이미 존재하는 데이터입니다',
                },
            });
        });
        it('should handle unknown error codes as internal error', () => {
            const error = { code: 'UNKNOWN_CODE', message: 'Unknown error' };
            handleSupabaseError(mockApp, mockReply, 'stories', error, '사용자 정의 메시지');
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: {
                    code: ErrorCode.INTERNAL_ERROR,
                    message: '사용자 정의 메시지',
                },
            });
        });
        it('should handle errors without code as internal error', () => {
            const error = { message: 'Some error' };
            handleSupabaseError(mockApp, mockReply, 'stories', error);
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: {
                    code: ErrorCode.INTERNAL_ERROR,
                    message: '서버 오류가 발생했습니다',
                },
            });
        });
        it('should return reply for chaining', () => {
            const error = { code: 'PGRST116' };
            const result = handleSupabaseError(mockApp, mockReply, 'stories', error);
            expect(result).toBe(mockReply);
        });
    });
    describe('integration tests', () => {
        it('should handle error flow consistently', () => {
            // Simulate error handling in a route
            const error = { code: 'PGRST116', message: 'Story not found' };
            const result = handleSupabaseError(mockApp, mockReply, 'GET /stories/:id', error, '스토리가 존재하지 않습니다');
            expect(mockApp.log.error).toHaveBeenCalled();
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(result).toBe(mockReply);
        });
        it('should allow custom error messages for all helper methods', () => {
            const helpers = [
                { fn: ErrorHelpers.validationError, status: 400 },
                { fn: ErrorHelpers.unauthorized, status: 401 },
                { fn: ErrorHelpers.forbidden, status: 403 },
                { fn: ErrorHelpers.notFound, status: 404 },
                { fn: ErrorHelpers.conflict, status: 409 },
                { fn: ErrorHelpers.internalError, status: 500 },
                { fn: ErrorHelpers.serviceUnavailable, status: 503 },
            ];
            helpers.forEach(({ fn, status }) => {
                const reply = createMockReply();
                fn(reply, 'Custom message');
                expect(reply.status).toHaveBeenCalledWith(status);
                const sendCall = reply.send.mock.calls[0][0];
                expect(sendCall.error.message).toBe('Custom message');
            });
        });
    });
});
//# sourceMappingURL=error-handler.test.js.map