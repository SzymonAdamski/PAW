import { LocalStorageApi } from '../api/localStorageApi';
import type { GoogleIdTokenPayload, LoggedUserState, User } from '../types';
import { notificationService } from './notificationService';
import { userService } from './userService';

const api = new LocalStorageApi<LoggedUserState>('logged-user-state');

function splitFullName(name: string): { firstName: string; lastName: string } {
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (!normalized) {
        return { firstName: '', lastName: '' };
    }

    const [firstName, ...rest] = normalized.split(' ');
    return {
        firstName,
        lastName: rest.join(' '),
    };
}

function decodeBase64Url(value: string): string {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(padded);

    return decodeURIComponent(
        Array.from(decoded)
            .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
            .join(''),
    );
}

export class AuthService {
    private state: LoggedUserState;

    constructor() {
        this.state = {
            userId: null,
            isLoggedIn: false,
        };
    }

    init(): void {
        this.state = this.loadState();
    }

    private loadState(): LoggedUserState {
        const existing = api.getItem();

        if (!existing) {
            return {
                userId: null,
                isLoggedIn: false,
            };
        }

        if (!existing.userId) {
            return {
                userId: null,
                isLoggedIn: false,
            };
        }

        if (!userService.getUserById(existing.userId)) {
            return {
                userId: null,
                isLoggedIn: false,
            };
        }

        return existing;
    }

    private persistState(nextState: LoggedUserState): void {
        this.state = nextState;
        api.setItem(nextState);
    }

    private decodeGoogleCredential(credential: string): GoogleIdTokenPayload {
        const parts = credential.split('.');
        if (parts.length < 2) {
            throw new Error('Niepoprawny token Google.');
        }

        try {
            const payload = decodeBase64Url(parts[1]);
            const parsed = JSON.parse(payload) as Partial<GoogleIdTokenPayload>;

            if (!parsed.sub || !parsed.email) {
                throw new Error('Brak wymaganych danych profilu Google.');
            }

            return {
                sub: parsed.sub,
                email: parsed.email,
                given_name: parsed.given_name,
                family_name: parsed.family_name,
                name: parsed.name,
            };
        } catch {
            throw new Error('Nie mozna odczytac danych logowania Google.');
        }
    }

    private async notifyAdminsAboutNewAccount(newUser: User): Promise<void> {
        const recipients = userService.getAdminUsers({
            excludeUserId: newUser.id,
            includeBlocked: false,
        });

        await Promise.all(recipients.map((admin) =>
            notificationService.create({
                title: 'Utworzenie nowego konta w systemie',
                message: `Nowe konto: ${newUser.firstName} ${newUser.lastName} (${newUser.email}).`,
                priority: 'high',
                recipientId: admin.id,
            }),
        ));
    }

    getState(): LoggedUserState {
        return { ...this.state };
    }

    isLoggedIn(): boolean {
        return this.state.isLoggedIn;
    }

    getLoggedUserId(): string | null {
        return this.state.userId;
    }

    async signInWithGoogleCredential(credential: string): Promise<{ user: User; isFirstLogin: boolean }> {
        const payload = this.decodeGoogleCredential(credential);
        const fallbackName = splitFullName(payload.name ?? '');

        const firstName = payload.given_name ?? fallbackName.firstName;
        const lastName = payload.family_name ?? fallbackName.lastName;

        const result = await userService.upsertFromGoogleProfile({
            providerUserId: payload.sub,
            email: payload.email,
            firstName,
            lastName,
        });

        this.persistState({
            userId: result.user.id,
            isLoggedIn: true,
        });

        if (result.isFirstLogin) {
            await this.notifyAdminsAboutNewAccount(result.user);
        }

        return result;
    }

    clearLoggedUser(): void {
        this.persistState({
            userId: null,
            isLoggedIn: false,
        });
    }
}

export const authService = new AuthService();
