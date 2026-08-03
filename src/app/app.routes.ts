import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes-guard';
import { expenseResolver } from './core/resolvers/expense-resolver';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { CategoryList } from './categories/category-list/category-list';
import { ExpenseDetail } from './expenses/expense-detail/expense-detail';
import { ExpenseForm } from './expenses/expense-form/expense-form';
import { ExpenseList } from './expenses/expense-list/expense-list';
import { NotFound } from './shared/not-found/not-found';

export const routes: Routes = [
  { path: '', redirectTo: 'expenses', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'register', component: Register, canActivate: [guestGuard] },
  {
    path: 'expenses',
    canActivate: [authGuard],
    children: [
      { path: '', component: ExpenseList },
      { path: 'new', component: ExpenseForm, canDeactivate: [unsavedChangesGuard] },
      {
        path: ':id/edit',
        component: ExpenseForm,
        resolve: { expense: expenseResolver },
        canDeactivate: [unsavedChangesGuard],
      },
      { path: ':id', component: ExpenseDetail, resolve: { expense: expenseResolver } },
    ],
  },
  { path: 'categories', component: CategoryList, canActivate: [authGuard] },
  { path: '**', component: NotFound },
];
