export const GIFTS_URL = "https://functions.poehali.dev/35f90c30-da2a-44d4-857d-77040633f44b";

export interface Gift {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  pointsCost: number;
  sortOrder: number;
  active: boolean;
}
