import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AuthService } from '../auth/auth';
import { Budget, NewBudget } from '../core/models/budget';
import { FIRESTORE } from '../core/tokens/firebase';

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private readonly firestore = inject(FIRESTORE);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly budgetsCollection = collection(this.firestore, 'budgets');

  readonly budgets = signal<Budget[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private unsubscribe: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      this.unsubscribe?.();
      this.unsubscribe = null;

      if (!user) {
        this.budgets.set([]);
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const budgetsQuery = query(
        this.budgetsCollection,
        where('ownerId', '==', user.uid),
        orderBy('month', 'desc'),
      );

      this.unsubscribe = onSnapshot(
        budgetsQuery,
        (snapshot) => {
          this.budgets.set(
            snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Budget),
          );
          this.error.set(null);
          this.loading.set(false);
        },
        (error) => {
          this.reportError('No se pudieron cargar los presupuestos', error);
          this.loading.set(false);
        },
      );
    });

    this.destroyRef.onDestroy(() => this.unsubscribe?.());
  }

  async addBudget(budget: Omit<NewBudget, 'ownerId'>): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      this.error.set('Debes iniciar sesión para agregar un presupuesto.');
      return;
    }

    const newBudget: NewBudget = { ...budget, ownerId: user.uid };
    try {
      await addDoc(this.budgetsCollection, newBudget);
      this.error.set(null);
    } catch (error) {
      this.reportError('No se pudo agregar el presupuesto', error);
    }
  }

  async updateBudget(id: string, changes: Partial<Omit<NewBudget, 'ownerId'>>): Promise<void> {
    try {
      await updateDoc(doc(this.firestore, 'budgets', id), changes);
      this.error.set(null);
    } catch (error) {
      this.reportError('No se pudo actualizar el presupuesto', error);
    }
  }

  async deleteBudget(id: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, 'budgets', id));
      this.error.set(null);
    } catch (error) {
      this.reportError('No se pudo eliminar el presupuesto', error);
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
