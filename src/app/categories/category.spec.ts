import { TestBed } from '@angular/core/testing';
import { FirebaseError } from 'firebase/app';
import { User } from 'firebase/auth';
import { QuerySnapshot, getDocs, where } from 'firebase/firestore';
import { AuthService } from '../auth/auth';
import { FIREBASE_AUTH, FIRESTORE } from '../core/tokens/firebase';
import { CategoryService } from './category';

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(() => () => {}),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

/** Lo único que `nameExists()` mira del snapshot es si vino vacío. */
function snapshotWith(found: boolean): QuerySnapshot {
  return { empty: !found } as QuerySnapshot;
}

describe('CategoryService', () => {
  let service: CategoryService;
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: FIRESTORE, useValue: {} as unknown as import('firebase/firestore').Firestore },
        { provide: FIREBASE_AUTH, useValue: {} as unknown as import('firebase/auth').Auth },
      ],
    });
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
      vi.mocked(getDocs).mockResolvedValue(snapshotWith(true));

      await expect(service.nameExists('Comida')).resolves.toBe(true);
    });

    it('deja pasar un nombre libre', async () => {
      vi.mocked(getDocs).mockResolvedValue(snapshotWith(false));

      await expect(service.nameExists('Comida')).resolves.toBe(false);
    });

    it('consulta solo entre las categorías del usuario', async () => {
      vi.mocked(getDocs).mockResolvedValue(snapshotWith(false));

      await service.nameExists('Comida');

      expect(where).toHaveBeenCalledWith('ownerId', '==', 'user-1');
      expect(where).toHaveBeenCalledWith('name', '==', 'Comida');
    });

    it('recorta los espacios antes de comparar', async () => {
      vi.mocked(getDocs).mockResolvedValue(snapshotWith(true));

      await expect(service.nameExists('  Comida  ')).resolves.toBe(true);
      expect(where).toHaveBeenCalledWith('name', '==', 'Comida');
    });

    it('no consulta con el campo vacío', async () => {
      await expect(service.nameExists('   ')).resolves.toBe(false);
      expect(getDocs).not.toHaveBeenCalled();
    });

    it('no consulta sin sesión', async () => {
      authService.currentUser.set(null);

      await expect(service.nameExists('Comida')).resolves.toBe(false);
      expect(getDocs).not.toHaveBeenCalled();
    });

    it('deja escapar el error para que lo traduzca el formulario', async () => {
      vi.mocked(getDocs).mockRejectedValue(new FirebaseError('unavailable', 'offline'));

      await expect(service.nameExists('Comida')).rejects.toThrow();
      // El banner general no se toca: el mensaje va al campo del formulario.
      expect(service.error()).toBeNull();
    });
  });
});
