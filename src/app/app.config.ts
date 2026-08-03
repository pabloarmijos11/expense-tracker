import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { FIRESTORE, FIREBASE_AUTH } from './core/tokens/firebase';

const firebaseApp = initializeApp(environment.firebaseConfig);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: FIRESTORE, useFactory: () => getFirestore(firebaseApp) },
    { provide: FIREBASE_AUTH, useFactory: () => getAuth(firebaseApp) },
  ],
};
