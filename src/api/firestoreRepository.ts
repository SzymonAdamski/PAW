import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import type { DataRepository, StoredEntity } from './dataRepository';
import { getFirestoreDb } from './firebaseClient';

export class FirestoreRepository<T extends StoredEntity> implements DataRepository<T> {
    private readonly collectionName: string;

    constructor(collectionName: string) {
        this.collectionName = collectionName;
    }

    async getAll(): Promise<T[]> {
        const snapshot = await getDocs(collection(getFirestoreDb(), this.collectionName));
        return snapshot.docs.map((item) => item.data() as T);
    }

    async set(item: T): Promise<void> {
        await setDoc(doc(getFirestoreDb(), this.collectionName, item.id), item);
    }

    async setAll(items: T[]): Promise<void> {
        await Promise.all(items.map((item) => this.set(item)));
    }

    async delete(id: string): Promise<void> {
        await deleteDoc(doc(getFirestoreDb(), this.collectionName, id));
    }
}
