import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fakeFirebase } from '../../core/tokens/firebase.fake';

import { ExpenseForm } from './expense-form';

describe('ExpenseForm', () => {
  let component: ExpenseForm;
  let fixture: ComponentFixture<ExpenseForm>;

  /** Los `kind` de los errores activos en un campo. */
  function errorKinds(field: { errors: () => readonly { kind: string }[] }): string[] {
    return field.errors().map((error) => error.kind);
  }

  function totalErrors() {
    return component.expenseForm.total();
  }

  function setLines(lines: Array<{ label: string; amount: number }>): void {
    component.expenseForm.lines().value.set(lines);
  }

  function setTotal(total: number): void {
    component.expenseForm.total().value.set(total);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseForm],
      providers: [
        provideRouter([]),
        ...fakeFirebase().providers,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('validación cruzada de líneas contra el total', () => {
    it('no exige nada cuando el gasto no tiene desglose', () => {
      setTotal(50);
      setLines([]);

      expect(errorKinds(totalErrors())).not.toContain('linesMismatch');
    });

    it('acepta el gasto cuando las líneas suman el total', () => {
      setTotal(50);
      setLines([
        { label: 'Almuerzo', amount: 30 },
        { label: 'Postre', amount: 20 },
      ]);

      expect(errorKinds(totalErrors())).not.toContain('linesMismatch');
    });

    it('rechaza el gasto cuando las líneas no cuadran', () => {
      setTotal(50);
      setLines([
        { label: 'Almuerzo', amount: 30 },
        { label: 'Postre', amount: 5 },
      ]);

      const error = totalErrors()
        .errors()
        .find((e) => e.kind === 'linesMismatch');

      expect(error).toBeDefined();
      expect(error?.message).toBe('Las líneas suman 35.00, pero el total es 50');
      expect(component.expenseForm().invalid()).toBe(true);
    });

    it('tolera el error de punto flotante (0.1 + 0.2 !== 0.3)', () => {
      setTotal(0.3);
      setLines([
        { label: 'Uno', amount: 0.1 },
        { label: 'Dos', amount: 0.2 },
      ]);

      expect(errorKinds(totalErrors())).not.toContain('linesMismatch');
    });

    it('deja pasar una diferencia de exactamente 0.01', () => {
      setTotal(50);
      setLines([{ label: 'Único', amount: 49.99 }]);

      expect(errorKinds(totalErrors())).not.toContain('linesMismatch');
    });

    it('marca una diferencia de 0.02', () => {
      setTotal(50);
      setLines([{ label: 'Único', amount: 49.98 }]);

      expect(errorKinds(totalErrors())).toContain('linesMismatch');
    });

    it('se recalcula al corregir el total', () => {
      setTotal(50);
      setLines([{ label: 'Único', amount: 35 }]);
      expect(errorKinds(totalErrors())).toContain('linesMismatch');

      setTotal(35);

      expect(errorKinds(totalErrors())).not.toContain('linesMismatch');
    });
  });

  describe('resto de reglas del formulario', () => {
    it('exige descripción, categoría y fecha', () => {
      expect(errorKinds(component.expenseForm.description())).toContain('required');
      expect(errorKinds(component.expenseForm.categoryId())).toContain('required');
      expect(errorKinds(component.expenseForm.date())).toContain('required');
    });

    it('no admite un total de 0', () => {
      setTotal(0);

      expect(errorKinds(totalErrors())).toContain('min');
    });

    it('no admite fechas futuras', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      component.expenseForm.date().value.set(tomorrow);

      expect(errorKinds(component.expenseForm.date())).toContain('futureDate');
    });

    it('acepta la fecha de hoy', () => {
      const today = new Date().toISOString().slice(0, 10);
      component.expenseForm.date().value.set(today);

      expect(errorKinds(component.expenseForm.date())).not.toContain('futureDate');
    });
  });
});
