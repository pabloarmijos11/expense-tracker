import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import {
  AUTH_SDK,
  AuthSdk,
  FIREBASE_AUTH,
  FIRESTORE,
  FIRESTORE_SDK,
  FirestoreSdk,
} from './core/tokens/firebase';

const firebaseApp = initializeApp(environment.firebaseConfig);

/**
 * Este es el único sitio donde el SDK real de Firebase entra en la aplicación.
 * Los servicios lo reciben por `AUTH_SDK` y `FIRESTORE_SDK`; ninguno importa
 * `firebase/auth` ni `firebase/firestore` por su cuenta. El porqué está
 * explicado en `core/tokens/firebase.ts`.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: FIRESTORE, useFactory: () => getFirestore(firebaseApp) },
    { provide: FIREBASE_AUTH, useFactory: () => getAuth(firebaseApp) },
    {
      provide: AUTH_SDK,
      useValue: {
        onAuthStateChanged,
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
        signOut,
        updateProfile,
      } satisfies AuthSdk,
    },
    {
      provide: FIRESTORE_SDK,
      useValue: {
        addDoc,
        collection,
        deleteDoc,
        doc,
        getDoc,
        getDocs,
        limit,
        onSnapshot,
        orderBy,
        query,
        updateDoc,
        where,
      } satisfies FirestoreSdk,
    },
  ],
};
