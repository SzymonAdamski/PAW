import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { appConfig } from '../config';

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function getFirestoreDb(): Firestore {
    if (!firebaseApp) {
        firebaseApp = initializeApp({
            apiKey: appConfig.firebase.apiKey,
            authDomain: appConfig.firebase.authDomain,
            projectId: appConfig.firebase.projectId,
            appId: appConfig.firebase.appId,
        });
    }

    if (!firestoreDb) {
        firestoreDb = getFirestore(firebaseApp);
    }

    return firestoreDb;
}
