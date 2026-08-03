import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, applyEach, form, min, required, submit, validate } from '@angular/forms/signals';
import { CategoryService } from '../../categories/category';
import { Expense } from '../../core/models/expense';
import { ExpenseService } from '../expense';

@Component({
  selector: 'app-expense-form',
  imports: [FormField, RouterLink],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseForm {
  protected readonly categoryService = inject(CategoryService);
  private readonly expenseService = inject(ExpenseService);
  private readonly router = inject(Router);

  readonly expense = input<Expense>();

  protected readonly isEditMode = computed(() => this.expense() !== undefined);
  protected readonly submitting = signal(false);
  readonly saved = signal(false);

  protected readonly model = signal({
    description: '',
    total: 0,
    categoryId: '',
    date: '',
    lines: [] as Array<{ label: string; amount: number }>,
  });

  constructor() {
    effect(() => {
      const existing = this.expense();
      if (existing) {
        this.model.set({
          description: existing.description,
          total: existing.total,
          categoryId: existing.categoryId,
          date: existing.date,
          lines: existing.lines,
        });
      }
    });
  }

  readonly expenseForm = form(this.model, (s) => {
    required(s.description, { message: 'La descripción es obligatoria' });
    required(s.categoryId, { message: 'Elige una categoría' });
    required(s.date, { message: 'La fecha es obligatoria' });
    min(s.total, 0.01, { message: 'El total debe ser mayor a 0' });

    validate(s.date, ({ value }) => {
      const today = new Date().toISOString().slice(0, 10);
      return value() > today
        ? { kind: 'futureDate', message: 'La fecha no puede ser futura' }
        : undefined;
    });

    applyEach(s.lines, (line) => {
      required(line.label, { message: 'La línea necesita una etiqueta' });
      min(line.amount, 0.01, { message: 'El monto debe ser mayor a 0' });
    });

    validate(s.total, ({ value, valueOf }) => {
      const lines = valueOf(s.lines);
      if (lines.length === 0) {
        return undefined;
      }
      const sum = lines.reduce((acc, line) => acc + line.amount, 0);
      return Math.abs(sum - value()) > 0.01
        ? {
            kind: 'linesMismatch',
            message: `Las líneas suman ${sum.toFixed(2)}, pero el total es ${value()}`,
          }
        : undefined;
    });
  });

  protected addLine(): void {
    this.model.update((m) => ({ ...m, lines: [...m.lines, { label: '', amount: 0 }] }));
  }

  protected removeLine(index: number): void {
    this.model.update((m) => ({ ...m, lines: m.lines.filter((_, i) => i !== index) }));
  }

  protected onSubmit(): void {
    submit(this.expenseForm, async () => {
      this.submitting.set(true);
      const existing = this.expense();
      if (existing) {
        await this.expenseService.updateExpense(existing.id, { ...this.model() });
      } else {
        await this.expenseService.addExpense({ ...this.model() });
      }
      this.submitting.set(false);
      this.saved.set(true);
      await this.router.navigateByUrl('/expenses');
    });
  }
}
