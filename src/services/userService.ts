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
            return existing;
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
        if (Array.isArray(existing) && existing.length > 0) {
            return existing;
        }

        const currentUser = this.currentUser!;
        const mockUsers: User[] = [
            currentUser,
            {
                id: uuidv4(),
                firstName: 'Maria',
                lastName: 'Nowak',
                email: 'maria.nowak@example.com',
                role: 'developer'
            },
            {
                id: uuidv4(),
                firstName: 'Piotr',
                lastName: 'Lewandowski',
                email: 'piotr.lewandowski@example.com',
                role: 'devops'
            }
        ];

        listApi.setAll(mockUsers);
        return mockUsers;
    }

    getCurrentUser(): User {
        return this.currentUser as User;
    }

    getAllUsers(): User[] {
        return [...this.allUsers];
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
            role: data.role !== undefined ? data.role : this.currentUser!.role,
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