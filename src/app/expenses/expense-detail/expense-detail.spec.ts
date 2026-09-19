import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Expense } from '../../core/models/expense';
import { fakeFirebase } from '../../core/tokens/firebase.fake';

import { ExpenseDetail } from './expense-detail';

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
        ...fakeFirebase().providers,
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
