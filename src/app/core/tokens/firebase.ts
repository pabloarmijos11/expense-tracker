import { InjectionToken } from '@angular/core';
import type { Auth } from 'firebase/auth';
import type {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type {
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
} from 'firebase/firestore';

export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');

/**
 * Los trozos del SDK de Firebase que la app llama de verdad.
 *
 * Los servicios inyectan esto en vez de importar las funciones desde
 * `firebase/auth` y `firebase/firestore`, y la diferencia no es cosmética.
 *
 * Un módulo importado no se puede sustituir con garantías en un test de este
 * proyecto: el builder de Angular empaqueta todos los specs juntos y decide por
 * su cuenta qué chunk se queda con cada módulo compartido. El resultado fue que
 * un `vi.mock` pasaba en Windows y fallaba en Linux — el spec vigilaba una copia
 * del doble y el servicio llamaba a otra, así que `mock.calls` salía vacío y
 * `mockResolvedValue()` no surtía efecto. 23 tests en verde en local y en rojo
 * en CI, sin que ninguno estuviera verificando nada.
 *
 * Un token no tiene esa ambigüedad: el test provee otro valor y se acabó.
 *
 * El tipo de cada campo se toma de la función real con `typeof`, así que si el
 * SDK cambia una firma, esto deja de compilar en vez de mentir.
 */
export interface AuthSdk {
  onAuthStateChanged: typeof onAuthStateChanged;
  createUserWithEmailAndPassword: typeof createUserWithEmailAndPassword;
  signInWithEmailAndPassword: typeof signInWithEmailAndPassword;
  signOut: typeof signOut;
  updateProfile: typeof updateProfile;
}

export interface FirestoreSdk {
  addDoc: typeof addDoc;
  collection: typeof collection;
  deleteDoc: typeof deleteDoc;
  doc: typeof doc;
  getDoc: typeof getDoc;
  getDocs: typeof getDocs;
  limit: typeof limit;
  onSnapshot: typeof onSnapshot;
  orderBy: typeof orderBy;
  query: typeof query;
  updateDoc: typeof updateDoc;
  where: typeof where;
}

export const AUTH_SDK = new InjectionToken<AuthSdk>('AUTH_SDK');
export const FIRESTORE_SDK = new InjectionToken<FirestoreSdk>('FIRESTORE_SDK');
