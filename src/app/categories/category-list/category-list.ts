import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { FormField, debounce, form, required, submit, validateAsync } from '@angular/forms/signals';
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

    // Retrasa la sincronización con el modelo: sin esto, la validación
    // asíncrona consultaría Firestore una vez por tecla.
    debounce(s.name, 300);

    validateAsync(s.name, {
      params: ({ value }) => value().trim(),
      factory: (name) =>
        resource({
          params: name,
          loader: ({ params }) => this.categoryService.nameExists(params),
        }),
      onSuccess: (exists) =>
        exists ? { kind: 'duplicate', message: 'Ya tienes una categoría con ese nombre' } : undefined,
      onError: () => ({ kind: 'error', message: 'No se pudo verificar el nombre' }),
    });
  });

  protected onSubmit(): void {
    submit(this.categoryForm, async () => {
      this.submitting.set(true);
      const { name, color } = this.model();
      await this.categoryService.addCategory({ name: name.trim(), color });
      this.model.set({ name: '', color: '#3b82f6' });
      this.submitting.set(false);
    });
  }

  protected async onDelete(id: string): Promise<void> {
    await this.categoryService.deleteCategory(id);
  }
}
