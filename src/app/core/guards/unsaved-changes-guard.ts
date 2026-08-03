import { CanDeactivateFn } from '@angular/router';
import { ExpenseForm } from '../../expenses/expense-form/expense-form';

export const unsavedChangesGuard: CanDeactivateFn<ExpenseForm> = (component) => {
  if (component.saved() || !component.expenseForm().dirty()) {
    return true;
  }

  return confirm('Tienes cambios sin guardar. ¿Seguro que quieres salir?');
};
