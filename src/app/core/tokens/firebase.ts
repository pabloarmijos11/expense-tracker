import { InjectionToken } from '@angular/core';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
