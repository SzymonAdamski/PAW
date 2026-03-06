import { v4 as uuidv4 } from 'uuid';
import type { User } from '../types';
import { LocalStorageApi } from '../api/localStorageApi';

const api = new LocalStorageApi<User>('mock-users');

export class UserService {
    private users: User | null = null;

    constructor() {
        this.users = this.loadOrCreateMockUser();
    }

    private loadOrCreateMockUser(): User {
        const existing = api.getItem();

        if (existing) {
            return existing;
        }
        const mockUser: User = {
            id: uuidv4(),
            firstName: 'Jan',
            lastName: 'Kowalski',
            email: 'janmaczetakrakovialove@example.com'
        };

        api.setItem(mockUser);
        return mockUser;
    }
    getCurrentUser(): User {
        return this.users as User;
    }
}