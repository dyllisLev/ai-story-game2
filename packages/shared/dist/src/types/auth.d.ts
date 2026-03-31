export interface AuthUser {
    id: string;
    email: string;
    nickname: string | null;
    role: 'pending' | 'user' | 'admin';
}
export interface UserProfile {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
    has_api_key: boolean;
    created_at: string;
}
export interface AuthSignupInput {
    email: string;
    password: string;
    nickname?: string;
}
export interface AuthLoginInput {
    email: string;
    password: string;
}
export interface AuthResponse {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
}
//# sourceMappingURL=auth.d.ts.map