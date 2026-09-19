import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import { AuthService } from '../auth/auth';
import { Expense, NewExpense } from '../core/models/expense';
import { FIRESTORE, FIRESTORE_SDK } from '../core/tokens/firebase';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private readonly firestore = inject(FIRESTORE);
  private readonly sdk = inject(FIRESTORE_SDK);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly expensesCollection = this.sdk.collection(this.firestore, 'expenses');

  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private unsubscribe: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      this.unsubscribe?.();
      this.unsubscribe = null;

      if (!user) {
        this.expenses.set([]);
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const expensesQuery = this.sdk.query(
        this.expensesCollection,
        this.sdk.where('ownerId', '==', user.uid),
        this.sdk.orderBy('date', 'desc'),
      );

      this.unsubscribe = this.sdk.onSnapshot(
        expensesQuery,
        (snapshot) => {
          this.expenses.set(
            snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Expense),
          );
          this.error.set(null);
          this.loading.set(false);
        },
        (error) => {
          this.reportError('No se pudieron cargar los gastos', error);
          this.loading.set(false);
        },
      );
    });

    this.destroyRef.onDestroy(() => this.unsubscribe?.());
  }

  async addExpense(expense: Omit<NewExpense, 'ownerId' | 'createdAt'>): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      this.error.set('Debes iniciar sesión para agregar un gasto.');
      return;
    }

    const newExpense: NewExpense = { ...expense, ownerId: user.uid, createdAt: Date.now() };
    try {
      await this.sdk.addDoc(this.expensesCollection, newExpense);
      this.error.set(null);
    } catch (error) {
      this.reportError('No se pudo agregar el gasto', error);
    }
  }

  async updateExpense(
    id: string,
    changes: Partial<Omit<NewExpense, 'ownerId' | 'createdAt'>>,
  ): Promise<void> {
    try {
      await this.sdk.updateDoc(this.sdk.doc(this.firestore, 'expenses', id), changes);
      this.error.set(null);
    } catch (error) {
      this.reportError('No se pudo actualizar el gasto', error);
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      await this.sdk.deleteDoc(this.sdk.doc(this.firestore, 'expenses', id));
      this.error.set(null);
    } catch (error) {
      this.reportError('No se pudo eliminar el gasto', error);
    }
  }

  async getExpenseById(id: string): Promise<Expense | null> {
    const snapshot = await this.sdk.getDoc(this.sdk.doc(this.firestore, 'expenses', id));
    if (!snapshot.exists()) {
      return null;
    }

    const expense = { id: snapshot.id, ...snapshot.data() } as Expense;
    const user = this.authService.currentUser();
    return user && expense.ownerId === user.uid ? expense : null;
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
        case 'permission-denied':
          return 'las reglas de seguridad de Firestore rechazaron la operación.';
        case 'unavailable':
          return 'no hay conexión con Firestore. Revisa tu internet.';
        case 'failed-precondition':
          return 'falta un índice en Firestore para esta consulta.';
        default:
          return `error de Firebase (${error.code}).`;
      }
    }

    return 'ocurrió un error inesperado.';
  }
}
