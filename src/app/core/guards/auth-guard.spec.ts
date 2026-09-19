import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import type { User } from 'firebase/auth';
import { AuthService } from '../../auth/auth';
import { fakeAuthSdk } from '../tokens/firebase.fake';
import { authGuard } from './auth-guard';

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('authGuard', () => {
  let router: Router;
  /** Simula lo que Firebase notifica al restaurar (o no) la sesión. */
  let emitAuthState: (user: User | null) => void;

  function executeGuard(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() => authGuard(route, state)) as Promise<
      boolean | UrlTree
    >;
  }

  /** Vacía la cola de microtareas para ver si el guard ya decidió. */
  function flush(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    const auth = fakeAuthSdk();
    emitAuthState = auth.emitAuthState;

    TestBed.configureTestingModule({
      providers: [provideRouter([]), ...auth.providers],
    });

    router = TestBed.inject(Router);
    TestBed.inject(AuthService); // registra el callback de onAuthStateChanged
  });

  it('should be created', () => {
    expect(authGuard).toBeTruthy();
  });

  it('deja pasar cuando hay sesión', async () => {
    emitAuthState({ uid: 'user-1' } as User);

    await expect(executeGuard()).resolves.toBe(true);
  });

  it('redirige a /login cuando no hay sesión', async () => {
    emitAuthState(null);

    const result = await executeGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('espera a que la sesión se restaure antes de decidir', async () => {
    // Estado inicial al recargar la página: Firebase todavía no notificó nada.
    let decided = false;
    const pending = executeGuard();
    void pending.then(() => {
      decided = true;
    });

    await flush();
    expect(decided).toBe(false); // sin esto vendría el parpadeo al login

    emitAuthState({ uid: 'user-1' } as User);

    await expect(pending).resolves.toBe(true);
  });
});
