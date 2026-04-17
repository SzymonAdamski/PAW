import type { GoogleCredentialResponse } from '../types';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let googleScriptPromise: Promise<void> | null = null;

function isGoogleLoaded(): boolean {
    return Boolean(window.google?.accounts?.id);
}

function loadGoogleScript(): Promise<void> {
    if (isGoogleLoaded()) {
        return Promise.resolve();
    }

    if (googleScriptPromise) {
        return googleScriptPromise;
    }

    googleScriptPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Nie mozna zaladowac Google Identity Services.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = GOOGLE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Nie mozna zaladowac Google Identity Services.'));
        document.head.appendChild(script);
    });

    return googleScriptPromise;
}

export async function renderGoogleSignInButton(
    container: HTMLElement,
    clientId: string,
    onCredential: (credential: string) => void,
): Promise<void> {
    if (!clientId.trim()) {
        throw new Error('Brak konfiguracji Google Client ID.');
    }

    await loadGoogleScript();

    const googleApi = window.google?.accounts?.id;
    if (!googleApi) {
        throw new Error('Google Identity Services nie sa dostepne.');
    }

    googleApi.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        callback: (response: GoogleCredentialResponse) => {
            if (typeof response.credential === 'string' && response.credential.length > 0) {
                onCredential(response.credential);
            }
        },
    });

    container.innerHTML = '';
    googleApi.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: 340,
    });
}

export function clearGoogleAutoSelect(): void {
    window.google?.accounts?.id.disableAutoSelect();
}
