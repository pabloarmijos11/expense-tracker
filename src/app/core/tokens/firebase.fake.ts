import { Provider } from '@angular/core';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

import { AUTH_SDK, AuthSdk, FIREBASE_AUTH, FIRESTORE, FIRESTORE_SDK, FirestoreSdk } from './firebase';

/**
 * Dobles del SDK de Firebase, inyectados por token.
 *
 * Sustituyen a lo que antes hacía `vi.mock('firebase/auth')` en cada spec. El
 * cambio no es de estilo: un `vi.mock` depende de qué copia del módulo le toque
 * a cada chunk cuando el builder de Angular empaqueta todos los specs juntos, y
 * ese reparto no es igual en Windows que en Linux. El spec acababa vigilando una
 * copia del doble mientras el servicio llamaba a otra — 23 tests verdes en local
 * y rojos en CI, sin que ninguno verificara nada. Aquí el spec provee el objeto
 * y el servicio recibe exactamente ese, sin intermediarios.
 *
 * Se siguen usando `vi.fn()` porque los specs se apoyan en `mockResolvedValue`,
 * `mockRejectedValue` y `toHaveBeenCalledWith`. Lo que desaparece es el `vi.mock`
 * a nivel de módulo, que era la parte frágil.
 *
 * Las firmas van anotadas a mano (`_auth: Auth, next: …`) en vez de dejarlas en
 * `vi.fn()` pelado: sin ellas TypeScript infiere una tupla de argumentos vacía y
 * `mock.calls[0][1]` no compila.
 */

export function fakeAuthSdk() {
  const auth = {} as Auth;

  const fns = {
    onAuthStateChanged: vi.fn((_auth: Auth, _next: (user: User | null) => void) => () => {}),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  };

  return {
    /** La instancia de Auth que reciben las funciones; los specs la comparan. */
    auth,
    /** Los dobles, para programar respuestas y comprobar llamadas. */
    fns,
    providers: [
      { provide: FIREBASE_AUTH, useValue: auth },
      { provide: AUTH_SDK, useValue: fns as unknown as AuthSdk },
    ] as Provider[],
    /**
     * Avisa de un cambio de sesión, como hace Firebase al restaurarla (o al
     * comprobar que no hay ninguna). Si nadie se suscribió, falla con un
     * mensaje que lo dice: el síntoma por defecto sería un `undefined` mudo.
     */
    emitAuthState(user: User | null): void {
      const call = fns.onAuthStateChanged.mock.calls[0];
      if (!call) {
        throw new Error(
          'Nadie se suscribió a onAuthStateChanged: ¿se llegó a construir AuthService?',
        );
      }
      call[1](user);
    },
  };
}

export function fakeFirestoreSdk() {
  const firestore = {} as Firestore;

  const fns = {
    addDoc: vi.fn(),
    collection: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(() => () => {}),
    orderBy: vi.fn(),
    query: vi.fn(),
    updateDoc: vi.fn(),
    where: vi.fn(),
  };

  return {
    firestore,
    fns,
    providers: [
      { provide: FIRESTORE, useValue: firestore },
      { provide: FIRESTORE_SDK, useValue: fns as unknown as FirestoreSdk },
    ] as Provider[],
  };
}

/**
 * Los cuatro tokens de una vez. Es lo que necesita cualquier spec que monte un
 * componente por encima de los servicios, sin interesarse por el SDK.
 */
export function fakeFirebase() {
  const auth = fakeAuthSdk();
  const firestore = fakeFirestoreSdk();

  return {
    auth,
    firestore,
    providers: [...auth.providers, ...firestore.providers] as Provider[],
  };
}
