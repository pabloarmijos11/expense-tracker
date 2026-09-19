import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryService } from '../../categories/category';
import { Budget } from '../../core/models/budget';
import { Category } from '../../core/models/category';
import { Expense } from '../../core/models/expense';
import { ExpenseService } from '../../expenses/expense';
import { BudgetService } from '../budget';
import { BudgetList } from './budget-list';

/**
 * Los tres servicios se reemplazan por dobles con signals escribibles: lo que
 * se prueba acá es la lógica del componente, no el listener de Firestore.
 */
describe('BudgetList', () => {
  let component: BudgetList;
  let fixture: ComponentFixture<BudgetList>;

  let budgets: WritableSignal<Budget[]>;
  let categories: WritableSignal<Category[]>;
  let expenses: WritableSignal<Expense[]>;
  let addBudget: ReturnType<typeof vi.fn>;
  let deleteBudget: ReturnType<typeof vi.fn>;

  function budget(partial: Partial<Budget>): Budget {
    return {
      id: 'budget-1',
      ownerId: 'user-1',
      categoryId: 'cat-1',
      month: '2026-08',
      limit: 100,
      ...partial,
    } as Budget;
  }

  function expense(partial: Partial<Expense>): Expense {
    return {
      id: 'expense-1',
      ownerId: 'user-1',
      categoryId: 'cat-1',
      description: 'Gasto',
      date: '2026-08-10',
      total: 10,
      lines: [],
      ...partial,
    } as Expense;
  }

  /** El formulario y las filas son `protected`: el test entra por corchetes. */
  function budgetForm() {
    return component['budgetForm'];
  }

  function rows() {
    return component['rows']();
  }

  function fillForm(categoryId: string, month: string): void {
    budgetForm().categoryId().value.set(categoryId);
    budgetForm().month().value.set(month);
  }

  function monthErrorKinds(): string[] {
    return budgetForm()
      .month()
      .errors()
      .map((error) => error.kind);
  }

  beforeEach(async () => {
    budgets = signal<Budget[]>([]);
    categories = signal<Category[]>([]);
    expenses = signal<Expense[]>([]);
    addBudget = vi.fn().mockResolvedValue(undefined);
    deleteBudget = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [BudgetList],
      providers: [
        {
          provide: BudgetService,
          useValue: {
            budgets,
            loading: signal(false),
            error: signal(null),
            addBudget,
            deleteBudget,
          } as unknown as BudgetService,
        },
        {
          provide: CategoryService,
          useValue: {
            categories,
            loading: signal(false),
            error: signal(null),
          } as unknown as CategoryService,
        },
        {
          provide: ExpenseService,
          useValue: {
            expenses,
            loading: signal(false),
            error: signal(null),
          } as unknown as ExpenseService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('presupuesto duplicado (categoría + mes)', () => {
    it('acepta la primera pareja categoría + mes', () => {
      fillForm('cat-1', '2026-08');

      expect(monthErrorKinds()).not.toContain('duplicate');
    });

    it('rechaza repetir la misma categoría en el mismo mes', () => {
      budgets.set([budget({ categoryId: 'cat-1', month: '2026-08' })]);

      fillForm('cat-1', '2026-08');

      const error = budgetForm()
        .month()
        .errors()
        .find((e) => e.kind === 'duplicate');
      expect(error?.message).toBe('Ya tienes un presupuesto para esa categoría en ese mes');
      expect(budgetForm()().invalid()).toBe(true);
    });

    it('permite la misma categoría en otro mes', () => {
      budgets.set([budget({ categoryId: 'cat-1', month: '2026-08' })]);

      fillForm('cat-1', '2026-09');

      expect(monthErrorKinds()).not.toContain('duplicate');
    });

    it('permite otra categoría en el mismo mes', () => {
      budgets.set([budget({ categoryId: 'cat-1', month: '2026-08' })]);

      fillForm('cat-2', '2026-08');

      expect(monthErrorKinds()).not.toContain('duplicate');
    });

    it('no valida mientras falte elegir la categoría', () => {
      budgets.set([budget({ categoryId: 'cat-1', month: '2026-08' })]);

      fillForm('', '2026-08');

      expect(monthErrorKinds()).not.toContain('duplicate');
    });

    it('se reevalúa cuando llega el snapshot de Firestore', () => {
      fillForm('cat-1', '2026-08');
      expect(monthErrorKinds()).not.toContain('duplicate');

      // El listener responde después de que el usuario ya llenó el formulario.
      budgets.set([budget({ categoryId: 'cat-1', month: '2026-08' })]);

      expect(monthErrorKinds()).toContain('duplicate');
    });
  });

  describe('cruce de presupuesto contra lo gastado', () => {
    beforeEach(() => {
      categories.set([{ id: 'cat-1', ownerId: 'user-1', name: 'Comida' } as Category]);
    });

    it('suma solo los gastos de esa categoría y ese mes', () => {
      budgets.set([budget({ categoryId: 'cat-1', month: '2026-08', limit: 100 })]);
      expenses.set([
        expense({ id: 'e1', categoryId: 'cat-1', date: '2026-08-05', total: 30 }),
        expense({ id: 'e2', categoryId: 'cat-1', date: '2026-08-20', total: 20 }),
        expense({ id: 'e3', categoryId: 'cat-1', date: '2026-07-20', total: 500 }), // otro mes
        expense({ id: 'e4', categoryId: 'cat-2', date: '2026-08-20', total: 500 }), // otra categoría
      ]);

      const [row] = rows();

      expect(row.categoryName).toBe('Comida');
      expect(row.spentLabel).toBe('50.00');
      expect(row.limitLabel).toBe('100.00');
      expect(row.differenceLabel).toBe('50.00');
      expect(row.exceeded).toBe(false);
      expect(row.percent).toBe(50);
    });

    it('marca el presupuesto excedido con la diferencia en positivo', () => {
      budgets.set([budget({ limit: 100 })]);
      expenses.set([expense({ total: 130 })]);

      const [row] = rows();

      expect(row.exceeded).toBe(true);
      expect(row.differenceLabel).toBe('30.00');
      expect(row.percent).toBe(100); // la barra no se pasa del 100 %
    });

    it('no se rompe si la categoría fue eliminada', () => {
      budgets.set([budget({ categoryId: 'cat-borrada' })]);

      expect(rows()[0].categoryName).toBe('Categoría eliminada');
    });

    it('no divide entre cero si el límite es 0', () => {
      budgets.set([budget({ limit: 0 })]);
      expenses.set([expense({ total: 10 })]);

      expect(rows()[0].percent).toBe(0);
    });
  });
});
