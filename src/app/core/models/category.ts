export interface Category {
  id: string;
  ownerId: string;
  name: string;
  color: string;
}

export type NewCategory = Omit<Category, 'id'>;
