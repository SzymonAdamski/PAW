export class LocalStorageApi<T> {
    constructor(private readonly key: string) {}

    getAll(): T[] {
        try {
            const raw = localStorage.getItem(this.key);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as T[];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }  
    }
    
    setAll(items: T[]): void {
        try {
            localStorage.setItem(this.key, JSON.stringify(items));
        } catch (error) {
            console.error("Błąd zapisu do localStorage:", error);
        }
    }

    clear(): void {
        localStorage.removeItem(this.key);
    }
}