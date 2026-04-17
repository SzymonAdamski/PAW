export type UserRole = 'admin' | 'devops' | 'developer' | 'guest';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    blocked: boolean;
    provider: 'google';
    providerUserId: string;
}

export interface GoogleUserProfile {
    providerUserId: string;
    email: string;
    firstName: string;
    lastName: string;
}
