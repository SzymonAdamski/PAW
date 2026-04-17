function getEnv(name: string): string {
    const value = (import.meta.env[name] as string | undefined) ?? '';
    return value.trim();
}

export const appConfig = {
    googleClientId: getEnv('VITE_GOOGLE_CLIENT_ID'),
    superAdminEmail: getEnv('VITE_SUPER_ADMIN_EMAIL').toLowerCase(),
};

export function getConfigurationErrors(): string[] {
    const errors: string[] = [];

    if (!appConfig.googleClientId) {
        errors.push('Brak VITE_GOOGLE_CLIENT_ID.');
    }

    if (!appConfig.superAdminEmail) {
        errors.push('Brak VITE_SUPER_ADMIN_EMAIL.');
    }

    return errors;
}
