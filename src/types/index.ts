export type UserRole = 'admin' | 'reader';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  role: UserRole;
  max_loans_allowed: number;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  category_id: number;
  category_name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Author {
  author_id: number;
  first_name: string;
  last_name: string;
  birth_date?: string;
  nationality?: string;
  biography?: string;
  is_active: boolean;
  created_at: string;
}

export interface Book {
  book_id: number;
  isbn: string;
  title: string;
  category_id: number;
  publisher?: string;
  publication_year?: number;
  pages?: number;
  description?: string;
  total_copies: number;
  available_copies: number;
  is_active: boolean;
  created_at: string;
  categories?: Category;
  book_authors?: { authors: Author; author_order: number }[];
}

export type LoanStatus = 'Active' | 'Returned' | 'Overdue';

export interface Loan {
  loan_id: number;
  book_id: number;
  user_id: string;
  loan_date: string;
  due_date: string;
  return_date?: string;
  status: LoanStatus;
  fine: number;
  notes?: string;
  books?: Book;
  profiles?: Profile;
}

export type ReservationStatus = 'Active' | 'Fulfilled' | 'Cancelled' | 'Expired';

export interface Reservation {
  reservation_id: number;
  book_id: number;
  user_id: string;
  reservation_date: string;
  expiration_date: string;
  status: ReservationStatus;
  notes?: string;
  books?: Book;
  profiles?: Profile;
}
