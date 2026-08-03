export interface ExpenseLine {
  label: string;
  amount: number;
}

export interface Expense {
  id: string;
  ownerId: string;
  description: string;
  total: number;
  categoryId: string;
  date: string; // 'YYYY-MM-DD'
  lines: ExpenseLine[];
  createdAt: number;
}

export type NewExpense = Omit<Expense, 'id'>;
