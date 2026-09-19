import { TestBed } from '@angular/core/testing';
import { FirebaseError } from 'firebase/app';
import type { User, UserCredential } from 'firebase/auth';
import { fakeAuthSdk } from '../core/tokens/firebase.fake';
import { AuthService } from './auth';

function fakeUser(uid = 'user-1'): User {
  return { uid, email: 'ada@example.com' } as User;
}

describe('AuthService', () => {
  let service: AuthService;
  // El SDK ya no se sustituye con `vi.mock` sino por token: el spec provee
  // estos dobles y `AuthService` recibe exactamente estos, sin depender de qué
  // copia del módulo le toque al chunk que arme el builder.
  let sdk: ReturnType<typeof fakeAuthSdk>;
  /** La instancia de Auth que deben recibir las funciones del SDK. */
  let AUTH: ReturnType<typeof fakeAuthSdk>['auth'];

  beforeEach(() => {
    // reportError() escribe en consola: se silencia para no ensuciar la salida.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    sdk = fakeAuthSdk();
    AUTH = sdk.auth;

    TestBed.configureTestingModule({ providers: sdk.providers });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sesión', () => {
    it('arranca cargando y sin usuario', () => {
      expect(service.loading()).toBe(true);
      expect(service.currentUser()).toBeNull();
      expect(service.isLoggedIn()).toBe(false);
    });

    it('publica el usuario y termina de cargar cuando Firebase restaura la sesión', async () => {
      const user = fakeUser();

      sdk.emitAuthState(user);

      expect(service.currentUser()).toBe(user);
      expect(service.loading()).toBe(false);
      expect(service.isLoggedIn()).toBe(true);
      await expect(service.ready).resolves.toBeUndefined();
    });

    it('termina de cargar aunque no haya sesión previa', async () => {
      sdk.emitAuthState(null);

      expect(service.currentUser()).toBeNull();
      expect(service.loading()).toBe(false);
      expect(service.isLoggedIn()).toBe(false);
      await expect(service.ready).resolves.toBeUndefined();
    });
  });

  describe('register()', () => {
    it('crea la cuenta y le asigna el displayName', async () => {
      const user = fakeUser();
      sdk.fns.createUserWithEmailAndPassword.mockResolvedValue({ user } as UserCredential);
      sdk.fns.updateProfile.mockResolvedValue(undefined);

      const ok = await service.register('ada@example.com', 'secreto123', 'Ada');

      expect(ok).toBe(true);
      expect(sdk.fns.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        AUTH,
        'ada@example.com',
        'secreto123',
      );
      expect(sdk.fns.updateProfile).toHaveBeenCalledWith(user, { displayName: 'Ada' });
      expect(service.error()).toBeNull();
    });

    it('devuelve false y traduce el correo ya registrado', async () => {
      sdk.fns.createUserWithEmailAndPassword.mockRejectedValue(
        new FirebaseError('auth/email-already-in-use', 'Email already in use'),
      );

      const ok = await service.register('ada@example.com', 'secreto123', 'Ada');

      expect(ok).toBe(false);
      expect(service.error()).toBe(
        'No se pudo crear la cuenta: ya existe una cuenta con ese correo.',
      );
      expect(sdk.fns.updateProfile).not.toHaveBeenCalled();
    });

    it('traduce la contraseña débil', async () => {
      sdk.fns.createUserWithEmailAndPassword.mockRejectedValue(
        new FirebaseError('auth/weak-password', 'Weak password'),
      );

      await service.register('ada@example.com', '123', 'Ada');

      expect(service.error()).toBe(
        'No se pudo crear la cuenta: la contraseña debe tener al menos 6 caracteres.',
      );
    });
  });

  describe('login()', () => {
    it('inicia sesión con las credenciales recibidas', async () => {
      sdk.fns.signInWithEmailAndPassword.mockResolvedValue({
        user: fakeUser(),
      } as UserCredential);

      const ok = await service.login('ada@example.com', 'secreto123');

      expect(ok).toBe(true);
      expect(sdk.fns.signInWithEmailAndPassword).toHaveBeenCalledWith(AUTH, 'ada@example.com', 'secreto123');
      expect(service.error()).toBeNull();
    });

    it('devuelve false y traduce las credenciales inválidas', async () => {
      sdk.fns.signInWithEmailAndPassword.mockRejectedValue(
        new FirebaseError('auth/invalid-credential', 'Invalid credential'),
      );

      const ok = await service.login('ada@example.com', 'mala');

      expect(ok).toBe(false);
      expect(service.error()).toBe('No se pudo iniciar sesión: correo o contraseña incorrectos.');
    });

    it('deja el código a la vista cuando el error de Firebase no está contemplado', async () => {
      sdk.fns.signInWithEmailAndPassword.mockRejectedValue(
        new FirebaseError('auth/network-request-failed', 'Network error'),
      );

      await service.login('ada@example.com', 'secreto123');

      expect(service.error()).toBe(
        'No se pudo iniciar sesión: error de Firebase (auth/network-request-failed).',
      );
    });

    it('no asume que todo error sea de Firebase', async () => {
      sdk.fns.signInWithEmailAndPassword.mockRejectedValue(new Error('algo explotó'));

      await service.login('ada@example.com', 'secreto123');

      expect(service.error()).toBe('No se pudo iniciar sesión: ocurrió un error inesperado.');
    });

    it('limpia el error de un intento anterior al acertar', async () => {
      sdk.fns.signInWithEmailAndPassword.mockRejectedValueOnce(
        new FirebaseError('auth/invalid-credential', 'Invalid credential'),
      );
      await service.login('ada@example.com', 'mala');
      expect(service.error()).not.toBeNull();

      sdk.fns.signInWithEmailAndPassword.mockResolvedValue({
        user: fakeUser(),
      } as UserCredential);
      await service.login('ada@example.com', 'secreto123');

      expect(service.error()).toBeNull();
    });
  });

  describe('logout()', () => {
    it('cierra la sesión', async () => {
      sdk.fns.signOut.mockResolvedValue(undefined);

      await service.logout();

      expect(sdk.fns.signOut).toHaveBeenCalledWith(AUTH);
      expect(service.error()).toBeNull();
    });

    it('reporta el fallo al cerrar sesión', async () => {
      sdk.fns.signOut.mockRejectedValue(new FirebaseError('auth/network-request-failed', 'x'));

      await service.logout();

      expect(service.error()).toBe(
        'No se pudo cerrar sesión: error de Firebase (auth/network-request-failed).',
      );
    });
  });

  it('dismissError() borra el error visible', async () => {
    sdk.fns.signInWithEmailAndPassword.mockRejectedValue(
      new FirebaseError('auth/invalid-credential', 'Invalid credential'),
    );
    await service.login('ada@example.com', 'mala');
    expect(service.error()).not.toBeNull();

    service.dismissError();

    expect(service.error()).toBeNull();
  });
});
