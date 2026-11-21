import type { PaginationMeta } from './api';

export type UserRole = 'user' | 'admin';

export type ActorState = 'guest' | UserRole;

export type LoanStatus = 'borrowed' | 'returned';

export type LoanStatusFilter = 'all' | 'borrowed' | 'overdue' | 'returned';

export interface UserProfile {
  id: number;
  name: string;
  nim: string | null;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthPayload {
  token: string;
  expiresIn: number;
  user: UserProfile;
}

export interface RegisterRequest {
  name: string;
  nim: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LibraryBook {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  publishedYear: number | null;
  stockTotal: number;
  stockAvailable: number;
  description: string;
  coverUrl: string | null;
  isBorrowedByMe?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLibraryBookRequest {
  title: string;
  author: string;
  isbn?: string | null;
  category?: string | null;
  publishedYear?: number | null;
  stockTotal: number;
  description: string;
  coverUrl?: string | null;
}

export interface UpdateLibraryBookRequest {
  title?: string;
  author?: string;
  isbn?: string | null;
  category?: string | null;
  publishedYear?: number | null;
  stockTotal?: number;
  description?: string;
  coverUrl?: string | null;
}

export interface LoanItem {
  id: number;
  bookId: number;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl?: string | null;
  status: LoanStatus;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string | null;
  isOverdue: boolean;
  daysRemaining: number;
}

export interface AdminLoanBorrower {
  id: number;
  name: string;
  nim: string | null;
  email: string;
}

export interface AdminLoanItem extends LoanItem {
  borrower: AdminLoanBorrower;
}

export interface PublicBookSummary {
  workId: string;
  title: string;
  authors: string[];
  firstPublishYear: number | null;
  coverUrl: string | null;
  subjects: string[];
  inReadlist: boolean;
}

export interface PublicBookDetail extends PublicBookSummary {
  description: string | null;
  descriptionFallback: string;
}

export interface ReadlistItem {
  id: number;
  workId: string;
  title: string;
  authors: string[];
  firstPublishYear: number | null;
  coverUrl: string | null;
  description: string | null;
  createdAt: string;
}

export interface UserOverview {
  activeLoansCount: number;
  overdueLoansCount: number;
  readlistCount: number;
  activeLoans: LoanItem[];
  recentReadlist: Omit<ReadlistItem, 'description'>[];
}

export interface AdminOverview {
  totalBooks: number;
  lowStockBooksCount: number;
  activeLoansCount: number;
  overdueLoansCount: number;
  recentLoans: LoanItem[];
}

export interface BookConnection {
  items: LibraryBook[];
  meta: PaginationMeta;
}

export interface PublicBookConnection {
  items: PublicBookSummary[];
  meta: PaginationMeta;
}
