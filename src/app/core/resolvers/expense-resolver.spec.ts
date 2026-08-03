import { TestBed } from '@angular/core/testing';
import { ResolveFn, provideRouter } from '@angular/router';
import { FIREBASE_AUTH, FIRESTORE } from '../tokens/firebase';

import { expenseResolver } from './expense-resolver';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
}));

describe('expenseResolver', () => {
  const executeResolver: ResolveFn<unknown> = (...resolverParameters) =>
    TestBed.runInInjectionContext(() => expenseResolver(...resolverParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: FIRESTORE, useValue: {} as unknown as import('firebase/firestore').Firestore },
        { provide: FIREBASE_AUTH, useValue: {} as unknown as import('firebase/auth').Auth },
      ],
    });
  });

  it('should be created', () => {
    expect(executeResolver).toBeTruthy();
  });
});
