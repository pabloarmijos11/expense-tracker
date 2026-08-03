import { TestBed } from '@angular/core/testing';
import { FIREBASE_AUTH, FIRESTORE } from '../core/tokens/firebase';
import { ExpenseService } from './expense';

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

describe('ExpenseService', () => {
  let service: ExpenseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: FIRESTORE, useValue: {} as unknown as import('firebase/firestore').Firestore },
        { provide: FIREBASE_AUTH, useValue: {} as unknown as import('firebase/auth').Auth },
      ],
    });
    service = TestBed.inject(ExpenseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
