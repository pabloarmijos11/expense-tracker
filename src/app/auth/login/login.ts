import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { AuthService } from '../auth';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);

  protected readonly model = signal({
    email: '',
    password: '',
  });

  protected readonly loginForm = form(this.model, (s) => {
    required(s.email, { message: 'El correo es obligatorio' });
    email(s.email, { message: 'El correo no es válido' });
    required(s.password, { message: 'La contraseña es obligatoria' });
  });

  protected onSubmit(): void {
    submit(this.loginForm, async () => {
      this.submitting.set(true);
      const success = await this.authService.login(this.model().email, this.model().password);
      this.submitting.set(false);
      if (success) {
        await this.router.navigateByUrl('/expenses');
      }
    });
  }
}
