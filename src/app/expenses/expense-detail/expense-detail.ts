import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../categories/category';
import { Expense } from '../../core/models/expense';

@Component({
  selector: 'app-expense-detail',
  imports: [RouterLink],
  templateUrl: './expense-detail.html',
  styleUrl: './expense-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseDetail {
  protected readonly categoryService = inject(CategoryService);

  readonly expense = input.required<Expense>();

  protected categoryName(categoryId: string): string {
    return this.categoryService.categories().find((c) => c.id === categoryId)?.name ?? categoryId;
  }
}
