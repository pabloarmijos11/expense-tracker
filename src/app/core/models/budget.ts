export interface Budget {
  id: string;
  ownerId: string;
  categoryId: string;
  month: string; // 'YYYY-MM'
  limit: number;
}

export type NewBudget = Omit<Budget, 'id'>;
