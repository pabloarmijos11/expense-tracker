import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { CategoryService } from '../category';

@Component({
  selector: 'app-category-list',
  imports: [FormField],
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryList {
  protected readonly categoryService = inject(CategoryService);
  protected readonly submitting = signal(false);

  protected readonly model = signal({
    name: '',
    color: '#3b82f6',
  });

  protected readonly categoryForm = form(this.model, (s) => {
    required(s.name, { message: 'El nombre es obligatorio' });
  });

  protected onSubmit(): void {
    submit(this.categoryForm, async () => {
      this.submitting.set(true);
      await this.categoryService.addCategory(this.model());
      this.model.set({ name: '', color: '#3b82f6' });
      this.submitting.set(false);
    });
  }

  protected async onDelete(id: string): Promise<void> {
    await this.categoryService.deleteCategory(id);
  }
}
