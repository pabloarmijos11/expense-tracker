import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Expense } from '../../core/models/expense';
import { FIREBASE_AUTH, FIRESTORE } from '../../core/tokens/firebase';

import { ExpenseDetail } from './expense-detail';

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

const testExpense: Expense = {
  id: 'e1',
  ownerId: 'u1',
  description: 'Café',
  total: 5,
  categoryId: 'c1',
  date: '2026-08-01',
  lines: [],
  createdAt: 1,
};

describe('ExpenseDetail', () => {
  let component: ExpenseDetail;
  let fixture: ComponentFixture<ExpenseDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseDetail],
      providers: [
        provideRouter([]),
        { provide: FIRESTORE, useValue: {} as unknown as import('firebase/firestore').Firestore },
        { provide: FIREBASE_AUTH, useValue: {} as unknown as import('firebase/auth').Auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseDetail);
    fixture.componentRef.setInput('expense', testExpense);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
