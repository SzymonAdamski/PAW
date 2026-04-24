import { appConfig } from '../config';
import type { DataRepository, StoredEntity } from './dataRepository';
import { FirestoreRepository } from './firestoreRepository';
import { LocalStorageRepository } from './localStorageRepository';

export function createRepository<T extends StoredEntity>(collectionName: string): DataRepository<T> {
    if (appConfig.dataStorage === 'firestore') {
        return new FirestoreRepository<T>(collectionName);
    }

    return new LocalStorageRepository<T>(collectionName);
}
