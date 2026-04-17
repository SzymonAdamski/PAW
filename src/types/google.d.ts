interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: { credential?: string; select_by?: string }) => void;
    ux_mode?: 'popup' | 'redirect';
}

interface GoogleIdButtonConfiguration {
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: string | number;
}

interface GoogleAccountsId {
    initialize(config: GoogleIdConfiguration): void;
    renderButton(parent: HTMLElement, options: GoogleIdButtonConfiguration): void;
    disableAutoSelect(): void;
}

interface GoogleAccounts {
    id: GoogleAccountsId;
}

interface GoogleWindowApi {
    accounts: GoogleAccounts;
}

interface Window {
    google?: GoogleWindowApi;
}
