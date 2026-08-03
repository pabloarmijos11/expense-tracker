import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { AuthService } from '../../auth/auth';
import { ExpenseService } from '../../expenses/expense';
import { Expense } from '../models/expense';

export const expenseResolver: ResolveFn<Expense | RedirectCommand> = async (route) => {
  const expenseService = inject(ExpenseService);
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ready;

  const id = route.paramMap.get('id');
  const expense = id ? await expenseService.getExpenseById(id) : null;

  return expense ?? new RedirectCommand(router.parseUrl('/expenses'));
};
