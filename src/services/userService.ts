import { v4 as uuidv4 } from 'uuid';
import type { User } from '../types';
import { LocalStorageApi } from '../api/localStorageApi';

const api = new LocalStorageApi<User>('mock-users');
const listApi = new LocalStorageApi<User>('users-list');

export class UserService {
    private currentUser: User | null = null;
    private allUsers: User[] = [];

    constructor() {
        this.currentUser = this.loadOrCreateCurrentUser();
        this.allUsers = this.loadOrCreateUsersList();
    }

    private loadOrCreateCurrentUser(): User {
        const existing = api.getItem();

        if (existing) {
            const normalized: User = {
                ...existing,
                role: 'admin',
            };
            api.setItem(normalized);
            return normalized;
        }
        const mockUser: User = {
            id: uuidv4(),
            firstName: 'Jan',
            lastName: 'Kowalski',
            email: 'jan.kowalski@example.com',
            role: 'admin'
        };

        api.setItem(mockUser);
        return mockUser;
    }

    private loadOrCreateUsersList(): User[] {
        const existing = listApi.getAll();
        const currentUser = this.currentUser!;
        const users = Array.isArray(existing) ? [...existing] : [];

        const currentUserIndex = users.findIndex((user) => user.id === currentUser.id);
        if (currentUserIndex >= 0) {
            users[currentUserIndex] = currentUser;
        } else {
            users.unshift(currentUser);
        }

        if (!users.some((user) => user.role === 'developer')) {
            users.push({
                id: uuidv4(),
                firstName: 'Maria',
                lastName: 'Nowak',
                email: 'maria.nowak@example.com',
                role: 'developer'
            });
        }

        if (!users.some((user) => user.role === 'devops')) {
            users.push({
                id: uuidv4(),
                firstName: 'Piotr',
                lastName: 'Lewandowski',
                email: 'piotr.lewandowski@example.com',
                role: 'devops'
            });
        }

        listApi.setAll(users);
        return users;
    }

    getCurrentUser(): User {
        return this.currentUser as User;
    }

    getAllUsers(): User[] {
        return [...this.allUsers];
    }

    getAssignableUsers(): User[] {
        return this.allUsers.filter((u) => u.role === 'developer' || u.role === 'devops');
    }

    getUserById(id: string): User | undefined {
        return this.allUsers.find(u => u.id === id);
    }

    updateCurrentUser(data: Partial<Omit<User, 'id'>>): User {
        const updated: User = {
            ...this.getCurrentUser(),
            firstName: data.firstName !== undefined ? data.firstName.trim() : this.currentUser!.firstName,
            lastName: data.lastName !== undefined ? data.lastName.trim() : this.currentUser!.lastName,
            email: data.email !== undefined ? data.email.trim() : this.currentUser!.email,
            role: 'admin',
        };
        api.setItem(updated);
        this.currentUser = updated;
        
        // Aktualizuj użytkownika w liście
        const index = this.allUsers.findIndex(u => u.id === updated.id);
        if (index !== -1) {
            this.allUsers[index] = updated;
            listApi.setAll(this.allUsers);
        }

        return updated;
    }

    clear(): void {
        api.removeItem();
        this.currentUser = null;
    }
}

export const userService = new UserService();
