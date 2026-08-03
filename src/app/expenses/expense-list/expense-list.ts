import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CategoryService } from '../../categories/category';
import { ExpenseService } from '../expense';

@Component({
  selector: 'app-expense-list',
  imports: [RouterLink],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseList {
  protected readonly expenseService = inject(ExpenseService);
  protected readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  readonly category = input<string | undefined>('');
  readonly month = input<string | undefined>('');
  readonly sort = input<string | undefined>('date');

  protected readonly filteredExpenses = computed(() => {
    let result = this.expenseService.expenses();

    const category = this.category();
    if (category) {
      result = result.filter((expense) => expense.categoryId === category);
    }

    const month = this.month();
    if (month) {
      result = result.filter((expense) => expense.date.startsWith(month));
    }

    const sort = this.sort();
    result = [...result].sort((a, b) =>
      sort === 'total' ? b.total - a.total : b.date.localeCompare(a.date),
    );

    return result;
  });

  protected readonly total = computed(() =>
    this.filteredExpenses().reduce((sum, expense) => sum + expense.total, 0),
  );

  protected readonly availableMonths = computed(() => {
    const months = new Set(this.expenseService.expenses().map((expense) => expense.date.slice(0, 7)));
    return [...months].sort((a, b) => b.localeCompare(a));
  });

  protected categoryName(categoryId: string): string {
    return this.categoryService.categories().find((c) => c.id === categoryId)?.name ?? categoryId;
  }

  protected updateFilter(key: 'category' | 'month' | 'sort', value: string): void {
    this.router.navigate([], {
      queryParams: { [key]: value || null },
      queryParamsHandling: 'merge',
    });
  }

  protected async onDelete(id: string): Promise<void> {
    await this.expenseService.deleteExpense(id);
  }
}
