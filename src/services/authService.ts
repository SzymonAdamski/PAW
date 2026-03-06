import { LocalStorageApi } from '../api/localStorageApi';
import type { LoggedUserState } from '../types';
import { userService } from './userService';

const api = new LocalStorageApi<LoggedUserState>('logged-user-state');

export class AuthService {
  private state: LoggedUserState;

  constructor() {
    this.state = this.loadOrCreateState();
  }

  private loadOrCreateState(): LoggedUserState {
    const existing = api.getItem();

    if (existing) {
      return existing;
    }

    const user = userService.getCurrentUser();

    const initialState: LoggedUserState = {
      userId: user.id,
      isLoggedIn: true,
    };

    api.setItem(initialState);
    return initialState;
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

  setLoggedUser(userId: string): LoggedUserState {
    this.state = {
      userId,
      isLoggedIn: true,
    };

    api.setItem(this.state);
    return this.getState();
  }

  clearLoggedUser(): void {
    this.state = {
      userId: null,
      isLoggedIn: false,
    };

    api.setItem(this.state);
  }
}

export const authService = new AuthService();