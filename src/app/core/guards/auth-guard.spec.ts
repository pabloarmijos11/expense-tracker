import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter } from '@angular/router';
import { FIREBASE_AUTH } from '../tokens/firebase';
import { authGuard } from './auth-guard';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FIREBASE_AUTH, useValue: {} as unknown as import('firebase/auth').Auth },
      ],
    });
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
