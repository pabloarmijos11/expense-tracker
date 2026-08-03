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
import { Category, NewCategory } from '../core/models/category';
import { FIRESTORE } from '../core/tokens/firebase';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly firestore = inject(FIRESTORE);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly categoriesCollection = collection(this.firestore, 'categories');

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private unsubscribe: (() => void) | null = null;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      this.unsubscribe?.();
      this.unsubscribe = null;

      if (!user) {
        this.categories.set([]);
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const categoriesQuery = query(
        this.categoriesCollection,
        where('ownerId', '==', user.uid),
        orderBy('name'),
      );

      this.unsubscribe = onSnapshot(
        categoriesQuery,
        (snapshot) => {
          this.categories.set(
            snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as Category),
          );
          this.error.set(null);
          this.loading.set(false);
        },
        (error) => {
          this.reportError('No se pudieron cargar las categorías', error);
          this.loading.set(false);
        },
      );
    });

    this.destroyRef.onDestroy(() => this.unsubscribe?.());
  }

  async addCategory(category: Omit<NewCategory, 'ownerId'>): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      this.error.set('Debes iniciar sesión para agregar una categoría.');
      return;
    }

    const newCategory: NewCategory = { ...category, ownerId: user.uid };
    try {
      await addDoc(this.categoriesCollection, newCategory);
      this.error.set(null);
    } catch (error) {
      this.reportError('No se pudo agregar la categoría', error);
    }
  }

  async updateCategory(id: string, changes: Partial<Omit<NewCategory, 'ownerId'>>): Promise<void> {
    try {
      await updateDoc(doc(this.firestore, 'categories', id), changes);
      this.error.set(null);
    } catch (error) {
      this.reportError('No se pudo actualizar la categoría', error);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await deleteDoc(doc(this.firestore, 'categories', id));
      this.error.set(null);
    } catch (error) {
      this.reportError('No se pudo eliminar la categoría', error);
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
