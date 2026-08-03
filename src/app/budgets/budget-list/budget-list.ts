import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, min, required, submit, validate } from '@angular/forms/signals';
import { CategoryService } from '../../categories/category';
import { ExpenseService } from '../../expenses/expense';
import { BudgetService } from '../budget';

@Component({
  selector: 'app-budget-list',
  imports: [FormField],
  templateUrl: './budget-list.html',
  styleUrl: './budget-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetList {
  protected readonly budgetService = inject(BudgetService);
  protected readonly categoryService = inject(CategoryService);
  private readonly expenseService = inject(ExpenseService);

  protected readonly submitting = signal(false);

  protected readonly model = signal({
    categoryId: '',
    month: new Date().toISOString().slice(0, 7),
    limit: 0,
  });

  /**
   * Cruza cada presupuesto con lo realmente gastado en esa categoría y ese
   * mes. Los importes se formatean acá y no con pipes en la plantilla, por la
   * convención que sigue el resto del proyecto.
   */
  protected readonly rows = computed(() => {
    const categories = this.categoryService.categories();
    const expenses = this.expenseService.expenses();

    return this.budgetService.budgets().map((budget) => {
      const spent = expenses
        .filter(
          (expense) =>
            expense.categoryId === budget.categoryId && expense.date.startsWith(budget.month),
        )
        .reduce((accumulated, expense) => accumulated + expense.total, 0);

      return {
        id: budget.id,
        month: budget.month,
        categoryName:
          categories.find((category) => category.id === budget.categoryId)?.name ??
          'Categoría eliminada',
        limitLabel: budget.limit.toFixed(2),
        spentLabel: spent.toFixed(2),
        // Siempre positivo: la plantilla decide si es "quedan" o "excedido"
        // según `exceeded`, sin tener que darle formato al signo.
        differenceLabel: Math.abs(budget.limit - spent).toFixed(2),
        percent: budget.limit > 0 ? Math.min(100, Math.round((spent / budget.limit) * 100)) : 0,
        exceeded: spent > budget.limit,
      };
    });
  });

  protected readonly budgetForm = form(this.model, (s) => {
    required(s.categoryId, { message: 'Elige una categoría' });
    required(s.month, { message: 'El mes es obligatorio' });
    min(s.limit, 0.01, { message: 'El límite debe ser mayor a 0' });

    // Validación cruzada: la pareja categoría + mes no puede repetirse. Se
    // ancla en el mes pero lee la categoría con valueOf, y consulta el signal
    // del servicio, así que se reevalúa sola cuando llega el snapshot.
    validate(s.month, ({ value, valueOf }) => {
      const categoryId = valueOf(s.categoryId);
      if (!categoryId || !value()) {
        return undefined;
      }

      const duplicated = this.budgetService
        .budgets()
        .some((budget) => budget.categoryId === categoryId && budget.month === value());

      return duplicated
        ? {
            kind: 'duplicate',
            message: 'Ya tienes un presupuesto para esa categoría en ese mes',
          }
        : undefined;
    });
  });

  protected onSubmit(): void {
    submit(this.budgetForm, async () => {
      this.submitting.set(true);
      await this.budgetService.addBudget(this.model());
      this.model.update((m) => ({ ...m, categoryId: '', limit: 0 }));
      this.submitting.set(false);
    });
  }

  protected async onDelete(id: string): Promise<void> {
    await this.budgetService.deleteBudget(id);
  }
}
