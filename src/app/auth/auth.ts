import { Injectable, computed, inject, signal } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import type { User } from 'firebase/auth';
import { AUTH_SDK, FIREBASE_AUTH } from '../core/tokens/firebase';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly sdk = inject(AUTH_SDK);

  readonly currentUser = signal<User | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  private resolveReady!: () => void;
  readonly ready: Promise<void> = new Promise((resolve) => {
    this.resolveReady = resolve;
  });

  constructor() {
    this.sdk.onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
      this.loading.set(false);
      this.resolveReady();
    });
  }

  async register(email: string, password: string, displayName: string): Promise<boolean> {
    try {
      const credential = await this.sdk.createUserWithEmailAndPassword(this.auth, email, password);
      await this.sdk.updateProfile(credential.user, { displayName });
      this.error.set(null);
      return true;
    } catch (error) {
      this.reportError('No se pudo crear la cuenta', error);
      return false;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      await this.sdk.signInWithEmailAndPassword(this.auth, email, password);
      this.error.set(null);
      return true;
    } catch (error) {
      this.reportError('No se pudo iniciar sesión', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.sdk.signOut(this.auth);
      this.error.set(null);
    } catch (error) {
      this.reportError('No se pudo cerrar sesión', error);
    }
  }

  dismissError(): void {
    this.error.set(null);
  }

  private reportError(context: string, error: unknown): void {
    console.error(context, error);
    this.error.set(`${context}: ${this.describeError(error)}`);
  }

  private describeError(error: unknown): string {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'ya existe una cuenta con ese correo.';
        case 'auth/invalid-credential':
          return 'correo o contraseña incorrectos.';
        case 'auth/weak-password':
          return 'la contraseña debe tener al menos 6 caracteres.';
        case 'auth/invalid-email':
          return 'el correo no tiene un formato válido.';
        case 'auth/too-many-requests':
          return 'demasiados intentos. Espera un momento e inténtalo de nuevo.';
        default:
          return `error de Firebase (${error.code}).`;
      }
    }

    return 'ocurrió un error inesperado.';
  }
}
