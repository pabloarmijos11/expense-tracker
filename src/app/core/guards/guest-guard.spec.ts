import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { User, onAuthStateChanged } from 'firebase/auth';
import { AuthService } from '../../auth/auth';
import { FIREBASE_AUTH } from '../tokens/firebase';
import { guestGuard } from './guest-guard';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('guestGuard', () => {
  let router: Router;

  /** Simula lo que Firebase notifica al restaurar (o no) la sesión. */
  function emitAuthState(user: User | null): void {
    const [, callback] = vi.mocked(onAuthStateChanged).mock.calls[0];
    (callback as (user: User | null) => void)(user);
  }

  function executeGuard(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() => guestGuard(route, state)) as Promise<
      boolean | UrlTree
    >;
  }

  /** Vacía la cola de microtareas para ver si el guard ya decidió. */
  function flush(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FIREBASE_AUTH, useValue: {} as unknown as import('firebase/auth').Auth },
      ],
    });

    router = TestBed.inject(Router);
    TestBed.inject(AuthService); // registra el callback de onAuthStateChanged
  });

  it('should be created', () => {
    expect(guestGuard).toBeTruthy();
  });

  it('deja ver login y registro cuando no hay sesión', async () => {
    emitAuthState(null);

    await expect(executeGuard()).resolves.toBe(true);
  });

  it('redirige a /expenses cuando ya hay sesión', async () => {
    emitAuthState({ uid: 'user-1' } as User);

    const result = await executeGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/expenses');
  });

  it('espera a que la sesión se restaure antes de decidir', async () => {
    let decided = false;
    const pending = executeGuard();
    void pending.then(() => {
      decided = true;
    });

    await flush();
    expect(decided).toBe(false); // si no, quien ya tiene sesión vería el login un instante

    emitAuthState({ uid: 'user-1' } as User);

    const result = await pending;
    expect(router.serializeUrl(result as UrlTree)).toBe('/expenses');
  });
});
