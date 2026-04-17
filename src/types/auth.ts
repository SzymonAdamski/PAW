export interface LoggedUserState {
    isLoggedIn: boolean;
    userId: string | null;
}

export interface GoogleCredentialResponse {
    credential?: string;
    select_by?: string;
}

export interface GoogleIdTokenPayload {
    sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
    name?: string;
}
