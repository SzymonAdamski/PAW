export interface StoredEntity {
    id: string;
}

export interface DataRepository<T extends StoredEntity> {
    getAll(): Promise<T[]>;
    set(item: T): Promise<void>;
    setAll(items: T[]): Promise<void>;
    delete(id: string): Promise<void>;
}
