function getEnv(name: string): string {
    const value = (import.meta.env[name] as string | undefined) ?? '';
    return value.trim();
}

export type DataStorage = 'localStorage' | 'firestore';

function getDataStorage(): DataStorage {
    const value = getEnv('VITE_DATA_STORAGE');

    if (value === 'firestore') {
        return 'firestore';
    }

    return 'localStorage';
}

export const appConfig = {
    googleClientId: getEnv('VITE_GOOGLE_CLIENT_ID'),
    superAdminEmail: getEnv('VITE_SUPER_ADMIN_EMAIL').toLowerCase(),
    dataStorage: getDataStorage(),
    firebase: {
        apiKey: getEnv('VITE_FIREBASE_API_KEY'),
        authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
        projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
        appId: getEnv('VITE_FIREBASE_APP_ID'),
    },
};

export function getConfigurationErrors(): string[] {
    const errors: string[] = [];
    const rawDataStorage = getEnv('VITE_DATA_STORAGE');

    if (!appConfig.googleClientId) {
        errors.push('Brak VITE_GOOGLE_CLIENT_ID.');
    }

    if (!appConfig.superAdminEmail) {
        errors.push('Brak VITE_SUPER_ADMIN_EMAIL.');
    }

    if (rawDataStorage && rawDataStorage !== 'localStorage' && rawDataStorage !== 'firestore') {
        errors.push('VITE_DATA_STORAGE musi miec wartosc localStorage albo firestore.');
    }

    if (appConfig.dataStorage === 'firestore') {
        if (!appConfig.firebase.apiKey) {
            errors.push('Brak VITE_FIREBASE_API_KEY.');
        }

        if (!appConfig.firebase.authDomain) {
            errors.push('Brak VITE_FIREBASE_AUTH_DOMAIN.');
        }

        if (!appConfig.firebase.projectId) {
            errors.push('Brak VITE_FIREBASE_PROJECT_ID.');
        }

        if (!appConfig.firebase.appId) {
            errors.push('Brak VITE_FIREBASE_APP_ID.');
        }
    }

    return errors;
}
