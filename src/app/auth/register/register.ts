import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, email, form, minLength, required, submit, validate } from '@angular/forms/signals';
import { AuthService } from '../auth';

@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);

  protected readonly model = signal({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  protected readonly registerForm = form(this.model, (s) => {
    required(s.displayName, { message: 'El nombre es obligatorio' });

    required(s.email, { message: 'El correo es obligatorio' });
    email(s.email, { message: 'El correo no es válido' });

    required(s.password, { message: 'La contraseña es obligatoria' });
    minLength(s.password, 8, { message: 'Debe tener al menos 8 caracteres' });

    required(s.confirmPassword, { message: 'Confirma tu contraseña' });
    validate(s.confirmPassword, ({ value, valueOf }) => {
      if (value() !== valueOf(s.password)) {
        return { kind: 'mismatch', message: 'Las contraseñas no coinciden' };
      }
      return undefined;
    });
  });

  protected onSubmit(): void {
    submit(this.registerForm, async () => {
      this.submitting.set(true);
      const success = await this.authService.register(
        this.model().email,
        this.model().password,
        this.model().displayName,
      );
      this.submitting.set(false);
      if (success) {
        await this.router.navigateByUrl('/expenses');
      }
    });
  }
}
