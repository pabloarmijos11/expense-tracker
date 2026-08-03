import { TestBed } from '@angular/core/testing';
import { FirebaseError } from 'firebase/app';
import {
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { FIREBASE_AUTH } from '../core/tokens/firebase';
import { AuthService } from './auth';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

const AUTH = {} as unknown as import('firebase/auth').Auth;

function fakeUser(uid = 'user-1'): User {
  return { uid, email: 'ada@example.com' } as User;
}

/** El callback que el constructor registró en onAuthStateChanged. */
function authStateCallback(): (user: User | null) => void {
  const [, callback] = vi.mocked(onAuthStateChanged).mock.calls[0];
  return callback as (user: User | null) => void;
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    // reportError() escribe en consola: se silencia para no ensuciar la salida.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [{ provide: FIREBASE_AUTH, useValue: AUTH }],
    });
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

      authStateCallback()(user);

      expect(service.currentUser()).toBe(user);
      expect(service.loading()).toBe(false);
      expect(service.isLoggedIn()).toBe(true);
      await expect(service.ready).resolves.toBeUndefined();
    });

    it('termina de cargar aunque no haya sesión previa', async () => {
      authStateCallback()(null);

      expect(service.currentUser()).toBeNull();
      expect(service.loading()).toBe(false);
      expect(service.isLoggedIn()).toBe(false);
      await expect(service.ready).resolves.toBeUndefined();
    });
  });

  describe('register()', () => {
    it('crea la cuenta y le asigna el displayName', async () => {
      const user = fakeUser();
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user } as UserCredential);
      vi.mocked(updateProfile).mockResolvedValue(undefined);

      const ok = await service.register('ada@example.com', 'secreto123', 'Ada');

      expect(ok).toBe(true);
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        AUTH,
        'ada@example.com',
        'secreto123',
      );
      expect(updateProfile).toHaveBeenCalledWith(user, { displayName: 'Ada' });
      expect(service.error()).toBeNull();
    });

    it('devuelve false y traduce el correo ya registrado', async () => {
      vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(
        new FirebaseError('auth/email-already-in-use', 'Email already in use'),
      );

      const ok = await service.register('ada@example.com', 'secreto123', 'Ada');

      expect(ok).toBe(false);
      expect(service.error()).toBe(
        'No se pudo crear la cuenta: ya existe una cuenta con ese correo.',
      );
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('traduce la contraseña débil', async () => {
      vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(
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
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: fakeUser(),
      } as UserCredential);

      const ok = await service.login('ada@example.com', 'secreto123');

      expect(ok).toBe(true);
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(AUTH, 'ada@example.com', 'secreto123');
      expect(service.error()).toBeNull();
    });

    it('devuelve false y traduce las credenciales inválidas', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(
        new FirebaseError('auth/invalid-credential', 'Invalid credential'),
      );

      const ok = await service.login('ada@example.com', 'mala');

      expect(ok).toBe(false);
      expect(service.error()).toBe('No se pudo iniciar sesión: correo o contraseña incorrectos.');
    });

    it('deja el código a la vista cuando el error de Firebase no está contemplado', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(
        new FirebaseError('auth/network-request-failed', 'Network error'),
      );

      await service.login('ada@example.com', 'secreto123');

      expect(service.error()).toBe(
        'No se pudo iniciar sesión: error de Firebase (auth/network-request-failed).',
      );
    });

    it('no asume que todo error sea de Firebase', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(new Error('algo explotó'));

      await service.login('ada@example.com', 'secreto123');

      expect(service.error()).toBe('No se pudo iniciar sesión: ocurrió un error inesperado.');
    });

    it('limpia el error de un intento anterior al acertar', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(
        new FirebaseError('auth/invalid-credential', 'Invalid credential'),
      );
      await service.login('ada@example.com', 'mala');
      expect(service.error()).not.toBeNull();

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: fakeUser(),
      } as UserCredential);
      await service.login('ada@example.com', 'secreto123');

      expect(service.error()).toBeNull();
    });
  });

  describe('logout()', () => {
    it('cierra la sesión', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined);

      await service.logout();

      expect(signOut).toHaveBeenCalledWith(AUTH);
      expect(service.error()).toBeNull();
    });

    it('reporta el fallo al cerrar sesión', async () => {
      vi.mocked(signOut).mockRejectedValue(new FirebaseError('auth/network-request-failed', 'x'));

      await service.logout();

      expect(service.error()).toBe(
        'No se pudo cerrar sesión: error de Firebase (auth/network-request-failed).',
      );
    });
  });

  it('dismissError() borra el error visible', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue(
      new FirebaseError('auth/invalid-credential', 'Invalid credential'),
    );
    await service.login('ada@example.com', 'mala');
    expect(service.error()).not.toBeNull();

    service.dismissError();

    expect(service.error()).toBeNull();
  });
});
