import { TestBed } from '@angular/core/testing';
import { FirebaseError } from 'firebase/app';
import type { User } from 'firebase/auth';
import type { QuerySnapshot } from 'firebase/firestore';
import { AuthService } from '../auth/auth';
import { fakeFirebase } from '../core/tokens/firebase.fake';
import { CategoryService } from './category';

/** Lo único que `nameExists()` mira del snapshot es si vino vacío. */
function snapshotWith(found: boolean): QuerySnapshot {
  return { empty: !found } as QuerySnapshot;
}

describe('CategoryService', () => {
  let service: CategoryService;
  let authService: AuthService;
  // Los dobles del SDK, creados de nuevo en cada test. Antes se llegaba a ellos
  // importando `getDocs` y `where` del módulo y pasándolos por `vi.mocked()`,
  // que es justo lo que fallaba en Linux: el spec miraba una copia y el
  // servicio llamaba a otra.
  let firestore: ReturnType<typeof fakeFirebase>['firestore']['fns'];

  beforeEach(() => {
    const firebase = fakeFirebase();
    firestore = firebase.firestore.fns;

    TestBed.configureTestingModule({ providers: firebase.providers });
    service = TestBed.inject(CategoryService);
    authService = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('nameExists()', () => {
    beforeEach(() => {
      authService.currentUser.set({ uid: 'user-1' } as User);
    });

    it('avisa que el nombre ya está tomado', async () => {
      firestore.getDocs.mockResolvedValue(snapshotWith(true));

      await expect(service.nameExists('Comida')).resolves.toBe(true);
    });

    it('deja pasar un nombre libre', async () => {
      firestore.getDocs.mockResolvedValue(snapshotWith(false));

      await expect(service.nameExists('Comida')).resolves.toBe(false);
    });

    it('consulta solo entre las categorías del usuario', async () => {
      firestore.getDocs.mockResolvedValue(snapshotWith(false));

      await service.nameExists('Comida');

      expect(firestore.where).toHaveBeenCalledWith('ownerId', '==', 'user-1');
      expect(firestore.where).toHaveBeenCalledWith('name', '==', 'Comida');
    });

    it('recorta los espacios antes de comparar', async () => {
      firestore.getDocs.mockResolvedValue(snapshotWith(true));

      await expect(service.nameExists('  Comida  ')).resolves.toBe(true);
      expect(firestore.where).toHaveBeenCalledWith('name', '==', 'Comida');
    });

    it('no consulta con el campo vacío', async () => {
      await expect(service.nameExists('   ')).resolves.toBe(false);
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });

    it('no consulta sin sesión', async () => {
      authService.currentUser.set(null);

      await expect(service.nameExists('Comida')).resolves.toBe(false);
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });

    it('deja escapar el error para que lo traduzca el formulario', async () => {
      firestore.getDocs.mockRejectedValue(new FirebaseError('unavailable', 'offline'));

      await expect(service.nameExists('Comida')).rejects.toThrow();
      // El banner general no se toca: el mensaje va al campo del formulario.
      expect(service.error()).toBeNull();
    });
  });
});
