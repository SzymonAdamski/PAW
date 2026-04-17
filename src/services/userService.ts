import type { GoogleUserProfile, User, UserRole } from '../types';
import { LocalStorageApi } from '../api/localStorageApi';
import { appConfig } from '../config';

const USERS_STORAGE_KEY = 'users';
const MIGRATION_FLAG_KEY = 'users-migration-v2-done';
const LEGACY_KEYS_TO_REMOVE = ['mock-users', 'users-list', 'logged-user-state', USERS_STORAGE_KEY];

const api = new LocalStorageApi<User>(USERS_STORAGE_KEY);

interface UpdateUserAccessDTO {
    role?: UserRole;
    blocked?: boolean;
}

function normalizeRole(value: unknown): UserRole {
    if (value === 'admin' || value === 'devops' || value === 'developer' || value === 'guest') {
        return value;
    }

    return 'guest';
}

function normalizeString(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
}

function normalizeEmail(value: unknown): string {
    return normalizeString(value).toLowerCase();
}

function fallbackFirstName(email: string): string {
    const localPart = email.split('@')[0] ?? '';
    const safe = localPart.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
    if (!safe) {
        return 'Uzytkownik';
    }

    return safe
        .split(' ')
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
        .join(' ');
}

function normalizeUser(raw: Partial<User>): User | null {
    const id = normalizeString(raw.id);
    const email = normalizeEmail(raw.email);
    const providerUserId = normalizeString(raw.providerUserId);

    if (!id || !email || !providerUserId) {
        return null;
    }

    const firstName = normalizeString(raw.firstName) || fallbackFirstName(email);
    const lastName = normalizeString(raw.lastName);

    return {
        id,
        firstName,
        lastName,
        email,
        role: normalizeRole(raw.role),
        blocked: Boolean(raw.blocked),
        provider: 'google',
        providerUserId,
    };
}

export class UserService {
    private allUsers: User[] = [];

    constructor() {
        this.runOneTimeMigration();
        this.allUsers = this.load();
    }

    private runOneTimeMigration(): void {
        if (localStorage.getItem(MIGRATION_FLAG_KEY)) {
            return;
        }

        LEGACY_KEYS_TO_REMOVE.forEach((key) => {
            localStorage.removeItem(key);
        });

        localStorage.setItem(MIGRATION_FLAG_KEY, '1');
    }

    private load(): User[] {
        try {
            const raw = api.getAll();
            if (!Array.isArray(raw)) {
                return [];
            }

            const normalized = raw
                .map((user) => normalizeUser(user))
                .filter((user): user is User => user !== null);

            api.setAll(normalized);
            return normalized;
        } catch (error) {
            console.error('Blad wczytywania uzytkownikow:', error);
            return [];
        }
    }

    private save(): void {
        api.setAll(this.allUsers);
    }

    private isSuperAdminEmail(email: string): boolean {
        return Boolean(appConfig.superAdminEmail) && email.toLowerCase() === appConfig.superAdminEmail;
    }

    getAllUsers(): User[] {
        return this.allUsers.map((user) => ({ ...user }));
    }

    getAdminUsers(options?: { excludeUserId?: string; includeBlocked?: boolean }): User[] {
        return this.allUsers
            .filter((user) => user.role === 'admin')
            .filter((user) => (options?.excludeUserId ? user.id !== options.excludeUserId : true))
            .filter((user) => (options?.includeBlocked ? true : !user.blocked))
            .map((user) => ({ ...user }));
    }

    getAssignableUsers(): User[] {
        return this.allUsers
            .filter((user) => !user.blocked && (user.role === 'developer' || user.role === 'devops'))
            .map((user) => ({ ...user }));
    }

    getUserById(id: string): User | undefined {
        const found = this.allUsers.find((user) => user.id === id);
        if (!found) {
            return undefined;
        }

        return { ...found };
    }

    upsertFromGoogleProfile(profile: GoogleUserProfile): { user: User; isFirstLogin: boolean } {
        const email = normalizeEmail(profile.email);
        const providerUserId = normalizeString(profile.providerUserId);

        if (!email || !providerUserId) {
            throw new Error('Niepoprawny profil Google.');
        }

        const firstName = normalizeString(profile.firstName) || fallbackFirstName(email);
        const lastName = normalizeString(profile.lastName);

        const foundByProviderIndex = this.allUsers.findIndex(
            (user) => user.provider === 'google' && user.providerUserId === providerUserId,
        );
        const foundByEmailIndex = this.allUsers.findIndex((user) => user.email.toLowerCase() === email);
        const index = foundByProviderIndex >= 0 ? foundByProviderIndex : foundByEmailIndex;

        const forcedRole: UserRole | null = this.isSuperAdminEmail(email) ? 'admin' : null;

        if (index >= 0) {
            const existing = this.allUsers[index];
            const updated: User = {
                ...existing,
                firstName,
                lastName,
                email,
                provider: 'google',
                providerUserId,
                role: forcedRole ?? existing.role,
            };

            this.allUsers[index] = updated;
            this.save();
            return { user: { ...updated }, isFirstLogin: false };
        }

        const created: User = {
            id: crypto.randomUUID(),
            firstName,
            lastName,
            email,
            role: forcedRole ?? 'guest',
            blocked: false,
            provider: 'google',
            providerUserId,
        };

        this.allUsers.push(created);
        this.save();
        return { user: { ...created }, isFirstLogin: true };
    }

    updateUserAccess(userId: string, payload: UpdateUserAccessDTO): User {
        const index = this.allUsers.findIndex((user) => user.id === userId);
        if (index === -1) {
            throw new Error('Uzytkownik o podanym ID nie istnieje.');
        }

        const current = this.allUsers[index];
        const updated: User = {
            ...current,
            role: payload.role ?? current.role,
            blocked: payload.blocked ?? current.blocked,
        };

        this.allUsers[index] = updated;
        this.save();
        return { ...updated };
    }
}

export const userService = new UserService();
