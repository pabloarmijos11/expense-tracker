import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn } from '@angular/router';
import { ExpenseForm } from '../../expenses/expense-form/expense-form';

import { unsavedChangesGuard } from './unsaved-changes-guard';

describe('unsavedChangesGuard', () => {
  const executeGuard: CanDeactivateFn<ExpenseForm> = (...guardParameters) =>
    TestBed.runInInjectionContext(() => unsavedChangesGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
