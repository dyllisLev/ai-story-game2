/**
 * Extract Bearer token from Authorization header
 * @returns Token string or undefined if header is missing/invalid
 */
export declare function extractBearerToken(authHeader: string | undefined): string | undefined;
/**
 * Extract cookie value by name from Cookie header
 * @param cookies - Cookie header string
 * @param name - Cookie name to extract
 * @returns Cookie value or undefined if not found
 */
export declare function extractCookieToken(cookies: string | undefined, name: string): string | undefined;
/**
 * Token and cookie name constants
 */
export declare const COOKIE_NAMES: {
    readonly ACCESS_TOKEN: "access_token";
    readonly REFRESH_TOKEN: "refresh_token";
};
/**
 * Token expiration in seconds
 */
export declare const TOKEN_EXPIRATION: {
    readonly ACCESS: number;
    readonly REFRESH: number;
};
/**
 * Rate limiting constants for auth endpoints
 */
export declare const AUTH_RATE_LIMITS: {
    readonly SIGNUP_MAX: 5;
    readonly SIGNUP_WINDOW: "1 minute";
    readonly LOGIN_MAX: 5;
    readonly LOGIN_WINDOW: "1 minute";
    readonly REFRESH_MAX: 10;
    readonly REFRESH_WINDOW: "1 hour";
};
