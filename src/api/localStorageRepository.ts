import type { DataRepository, StoredEntity } from './dataRepository';
import { LocalStorageApi } from './localStorageApi';

export class LocalStorageRepository<T extends StoredEntity> implements DataRepository<T> {
    private readonly api: LocalStorageApi<T>;

    constructor(key: string) {
        this.api = new LocalStorageApi<T>(key);
    }

    async getAll(): Promise<T[]> {
        return this.api.getAll();
    }

    async set(item: T): Promise<void> {
        const items = this.api.getAll();
        const index = items.findIndex((existing) => existing.id === item.id);

        if (index >= 0) {
            items[index] = item;
        } else {
            items.push(item);
        }

        this.api.setAll(items);
    }

    async setAll(items: T[]): Promise<void> {
        this.api.setAll(items);
    }

    async delete(id: string): Promise<void> {
        this.api.setAll(this.api.getAll().filter((item) => item.id !== id));
    }
}
