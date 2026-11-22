import type { GraphQLRequest, PaginationMeta } from '../../types/api';
import type {
  AdminLoanItem,
  AdminOverview,
  AuthPayload,
  BookConnection,
  CreateLibraryBookRequest,
  LibraryBook,
  LoanItem,
  LoanStatusFilter,
  LoginRequest,
  PublicBookConnection,
  PublicBookDetail,
  ReadlistItem,
  RegisterRequest,
  UpdateLibraryBookRequest,
  UserOverview,
  UserProfile,
} from '../../types/domain';
import { setAuthToken } from '../api-client';
import { ApiError } from '../api-error';
import { getMockStateStorageKey } from '../env';
import { createInitialMockState, type MockState, type MockUserRecord } from './mock-seed';

const MOCK_TOKEN_PREFIX = 'mock-jwt-';

let memoryMockState: MockState | null = null;

function cloneState(state: MockState): MockState {
  return JSON.parse(JSON.stringify(state)) as MockState;
}

export function loadMockState(): MockState {
  if (memoryMockState) return memoryMockState;

  try {
    const raw = window.localStorage.getItem(getMockStateStorageKey());
    if (raw) {
      memoryMockState = JSON.parse(raw) as MockState;
      return memoryMockState;
    }
  } catch {
    // Fallback ke state awal in-memory
  }

  memoryMockState = createInitialMockState();
  saveMockState(memoryMockState);
  return memoryMockState;
}

function saveMockState(state: MockState): void {
  memoryMockState = state;
  try {
    window.localStorage.setItem(getMockStateStorageKey(), JSON.stringify(state));
  } catch {
    // Abaikan jika storage tidak tersedia
  }
}

export function resetMockState(): MockState {
  const fresh = cloneState(createInitialMockState());
  saveMockState(fresh);
  return fresh;
}

export function buildMockToken(userId: number): string {
  return `${MOCK_TOKEN_PREFIX}${userId}`;
}

export function switchMockSessionRole(role: 'guest' | 'user' | 'admin'): UserProfile | null {
  const state = loadMockState();
  if (role === 'guest') {
    setAuthToken(null);
    return null;
  }

  const targetUser = state.users.find((u) => u.role === role);
  if (!targetUser) {
    setAuthToken(null);
    return null;
  }

  setAuthToken(buildMockToken(targetUser.id));
  return stripPassword(targetUser);
}

function stripPassword(user: MockUserRecord): UserProfile {
  return {
    id: user.id,
    name: user.name,
    nim: user.nim,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function resolveUserFromToken(state: MockState, token: string | null): MockUserRecord | null {
  if (!token || !token.startsWith(MOCK_TOKEN_PREFIX)) return null;
  const userId = Number(token.slice(MOCK_TOKEN_PREFIX.length));
  if (!Number.isInteger(userId)) return null;
  return state.users.find((u) => u.id === userId) ?? null;
}

function requireUser(state: MockState, token: string | null): MockUserRecord {
  const user = resolveUserFromToken(state, token);
  if (!user) {
    throw new ApiError('Sesi tidak valid atau belum masuk.', 401, 'UNAUTHORIZED');
  }
  return user;
}

function requireRole(user: MockUserRecord, role: 'user' | 'admin'): void {
  if (user.role !== role) {
    throw new ApiError(
      'Peran Anda tidak memiliki akses ke resource ini.',
      403,
      'FORBIDDEN',
    );
  }
}

function paginate<T>(items: T[], page: number, limit: number): { items: T[]; meta: PaginationMeta } {
  const safeLimit = Math.max(1, limit);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safeLimit;
  return {
    items: items.slice(start, start + safeLimit),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

function enrichLibraryBookForUser(
  book: LibraryBook,
  loans: AdminLoanItem[],
  user: MockUserRecord | null,
): LibraryBook {
  if (!user || user.role !== 'user') {
    return { ...book };
  }
  const isBorrowedByMe = loans.some(
    (loan) =>
      loan.bookId === book.id &&
      loan.borrower.id === user.id &&
      loan.status === 'borrowed',
  );
  return {
    ...book,
    isBorrowedByMe,
  };
}

function toLoanItem(loan: AdminLoanItem): LoanItem {
  return {
    id: loan.id,
    bookId: loan.bookId,
    bookTitle: loan.bookTitle,
    bookAuthor: loan.bookAuthor,
    bookCoverUrl: loan.bookCoverUrl,
    status: loan.status,
    borrowedAt: loan.borrowedAt,
    dueDate: loan.dueDate,
    returnedAt: loan.returnedAt,
    isOverdue: loan.isOverdue,
    daysRemaining: loan.daysRemaining,
  };
}

function filterLoansByStatus(loans: AdminLoanItem[], statusFilter: LoanStatusFilter): AdminLoanItem[] {
  if (statusFilter === 'all') return loans;
  if (statusFilter === 'overdue') {
    return loans.filter((l) => l.status === 'borrowed' && l.isOverdue);
  }
  return loans.filter((l) => l.status === statusFilter);
}

export async function handleMockRest<T>(
  method: string,
  rawUrl: string,
  body: unknown,
  token: string | null,
): Promise<T> {
  const state = loadMockState();
  const parsedUrl = new URL(rawUrl, 'http://mock.local');
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;
  const currentUser = resolveUserFromToken(state, token);

  // Health check
  if (method === 'GET' && pathname === '/api/v1/health') {
    return {
      success: true,
      message: 'Server mock sehat',
      data: { status: 'ok', database: 'mock', timestamp: new Date().toISOString() },
    } as T;
  }

  // Auth: Login
  if (method === 'POST' && pathname === '/api/v1/auth/login') {
    const payload = (body ?? {}) as Partial<LoginRequest>;
    const identifier = (payload.identifier ?? '').trim().toLowerCase();
    const password = payload.password ?? '';
    const found = state.users.find(
      (u) =>
        (u.email.toLowerCase() === identifier || (u.nim?.toLowerCase() === identifier && u.nim !== null)) &&
        u.password === password,
    );

    if (!found) {
      throw new ApiError('Email/NIM atau kata sandi salah.', 401, 'UNAUTHORIZED');
    }

    const authPayload: AuthPayload = {
      token: buildMockToken(found.id),
      expiresIn: 86400,
      user: stripPassword(found),
    };

    return {
      success: true,
      message: 'Login berhasil',
      data: authPayload,
    } as T;
  }

  // Auth: Register
  if (method === 'POST' && pathname === '/api/v1/auth/register') {
    const payload = (body ?? {}) as Partial<RegisterRequest>;
    const email = (payload.email ?? '').trim().toLowerCase();
    const nim = (payload.nim ?? '').trim().toUpperCase();

    if (state.users.some((u) => u.email.toLowerCase() === email)) {
      throw new ApiError('Email sudah terdaftar.', 409, 'CONFLICT', [
        { field: 'email', message: 'Email sudah digunakan' },
      ]);
    }
    if (state.users.some((u) => u.nim?.toUpperCase() === nim)) {
      throw new ApiError('NIM sudah terdaftar.', 409, 'CONFLICT', [
        { field: 'nim', message: 'NIM sudah digunakan' },
      ]);
    }

    const newUser: MockUserRecord = {
      id: state.nextUserId++,
      name: (payload.name ?? '').trim(),
      nim,
      email,
      role: 'user',
      password: payload.password ?? '',
      createdAt: new Date().toISOString(),
    };
    state.users.push(newUser);
    saveMockState(state);

    const authPayload: AuthPayload = {
      token: buildMockToken(newUser.id),
      expiresIn: 86400,
      user: stripPassword(newUser),
    };

    return {
      success: true,
      message: 'Registrasi berhasil',
      data: authPayload,
    } as T;
  }

  // Auth: Me
  if (method === 'GET' && pathname === '/api/v1/auth/me') {
    const user = requireUser(state, token);
    return {
      success: true,
      message: 'Profil berhasil diambil',
      data: stripPassword(user),
    } as T;
  }

  // Books: List
  if (method === 'GET' && pathname === '/api/v1/books') {
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();
    const category = (searchParams.get('category') ?? '').trim().toLowerCase();
    const availableOnly = searchParams.get('availableOnly') === 'true';
    const page = Number(searchParams.get('page') ?? 1);
    const limit = Number(searchParams.get('limit') ?? 10);

    const filtered = state.books
      .filter((b) => {
        if (q) {
          const match =
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            (b.isbn ?? '').toLowerCase().includes(q);
          if (!match) return false;
        }
        if (category && (b.category ?? '').toLowerCase() !== category) {
          return false;
        }
        if (availableOnly && b.stockAvailable <= 0) {
          return false;
        }
        return true;
      })
      .map((b) => enrichLibraryBookForUser(b, state.loans, currentUser));

    const result = paginate(filtered, page, limit);
    return {
      success: true,
      message: 'Daftar buku berhasil diambil',
      data: result.items,
      meta: result.meta,
    } as T;
  }

  // Books: Create (Admin)
  if (method === 'POST' && pathname === '/api/v1/books') {
    const user = requireUser(state, token);
    requireRole(user, 'admin');
    const payload = body as CreateLibraryBookRequest;
    const now = new Date().toISOString();
    const created: LibraryBook = {
      id: state.nextBookId++,
      title: payload.title,
      author: payload.author,
      isbn: payload.isbn ?? null,
      category: payload.category ?? null,
      publishedYear: payload.publishedYear ?? null,
      stockTotal: payload.stockTotal,
      stockAvailable: payload.stockTotal,
      description: payload.description,
      coverUrl: payload.coverUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
    state.books.unshift(created);
    saveMockState(state);
    return {
      success: true,
      message: 'Buku berhasil ditambahkan',
      data: created,
    } as T;
  }

  // Books: Detail / Update / Delete
  const bookMatch = pathname.match(/^\/api\/v1\/books\/(\d+)$/);
  if (bookMatch) {
    const bookId = Number(bookMatch[1]);
    const idx = state.books.findIndex((b) => b.id === bookId);
    if (idx === -1) {
      throw new ApiError('Buku perpustakaan tidak ditemukan.', 404, 'NOT_FOUND');
    }

    if (method === 'GET') {
      return {
        success: true,
        message: 'Detail buku berhasil diambil',
        data: enrichLibraryBookForUser(state.books[idx], state.loans, currentUser),
      } as T;
    }

    if (method === 'PUT') {
      const user = requireUser(state, token);
      requireRole(user, 'admin');
      const payload = body as UpdateLibraryBookRequest;
      const existing = state.books[idx];
      const activeBorrowedCount = state.loans.filter(
        (l) => l.bookId === existing.id && l.status === 'borrowed',
      ).length;

      const nextTotal = payload.stockTotal ?? existing.stockTotal;
      if (nextTotal < activeBorrowedCount) {
        throw new ApiError(
          'Stok total tidak boleh lebih kecil dari jumlah buku yang sedang dipinjam.',
          409,
          'STOCK_BELOW_BORROWED',
        );
      }

      const updated: LibraryBook = {
        ...existing,
        ...payload,
        stockTotal: nextTotal,
        stockAvailable: nextTotal - activeBorrowedCount,
        updatedAt: new Date().toISOString(),
      };
      state.books[idx] = updated;
      saveMockState(state);

      return {
        success: true,
        message: 'Buku berhasil diperbarui',
        data: updated,
      } as T;
    }

    if (method === 'DELETE') {
      const user = requireUser(state, token);
      requireRole(user, 'admin');
      const hasActiveLoans = state.loans.some(
        (l) => l.bookId === bookId && l.status === 'borrowed',
      );
      if (hasActiveLoans) {
        throw new ApiError(
          'Buku sedang dipinjam dan tidak dapat dihapus.',
          409,
          'BOOK_IN_ACTIVE_LOAN',
        );
      }
      state.books.splice(idx, 1);
      saveMockState(state);
      return {
        success: true,
        message: 'Buku berhasil dihapus',
        data: { id: bookId },
      } as T;
    }
  }

  // Loans: User loans list
  if (method === 'GET' && pathname === '/api/v1/loans/my') {
    const user = requireUser(state, token);
    requireRole(user, 'user');
    const statusFilter = (searchParams.get('status') ?? 'all') as LoanStatusFilter;
    const page = Number(searchParams.get('page') ?? 1);
    const limit = Number(searchParams.get('limit') ?? 10);

    const mine = filterLoansByStatus(
      state.loans.filter((l) => l.borrower.id === user.id),
      statusFilter,
    ).map(toLoanItem);
    const result = paginate(mine, page, limit);
    return {
      success: true,
      message: 'Daftar peminjaman berhasil diambil',
      data: result.items,
      meta: result.meta,
    } as T;
  }

  // Loans: Borrow book
  if (method === 'POST' && pathname === '/api/v1/loans') {
    const user = requireUser(state, token);
    requireRole(user, 'user');
    const { bookId } = (body ?? {}) as { bookId?: number };
    const book = state.books.find((b) => b.id === bookId);
    if (!book) {
      throw new ApiError('Buku perpustakaan tidak ditemukan.', 404, 'NOT_FOUND');
    }

    const activeUserLoans = state.loans.filter(
      (l) => l.borrower.id === user.id && l.status === 'borrowed',
    );
    if (activeUserLoans.some((l) => l.bookId === book.id)) {
      throw new ApiError(
        'Anda masih meminjam judul buku yang sama.',
        409,
        'DUPLICATE_ACTIVE_LOAN',
      );
    }
    if (activeUserLoans.length >= 3) {
      throw new ApiError(
        'Kuota peminjaman maksimal 3 buku aktif telah tercapai.',
        409,
        'LOAN_LIMIT_EXCEEDED',
      );
    }
    if (book.stockAvailable <= 0) {
      throw new ApiError('Stok buku sedang habis.', 409, 'OUT_OF_STOCK');
    }

    book.stockAvailable -= 1;
    const now = new Date();
    const due = new Date(now.getTime() + 7 * 86_400_000);
    const newLoan: AdminLoanItem = {
      id: state.nextLoanId++,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookCoverUrl: book.coverUrl,
      status: 'borrowed',
      borrowedAt: now.toISOString(),
      dueDate: due.toISOString(),
      returnedAt: null,
      isOverdue: false,
      daysRemaining: 7,
      borrower: {
        id: user.id,
        name: user.name,
        nim: user.nim,
        email: user.email,
      },
    };
    state.loans.unshift(newLoan);
    saveMockState(state);

    return {
      success: true,
      message: 'Buku berhasil dipinjam',
      data: toLoanItem(newLoan),
    } as T;
  }

  // Loans: Return book
  const returnMatch = pathname.match(/^\/api\/v1\/loans\/(\d+)\/return$/);
  if (method === 'PATCH' && returnMatch) {
    const user = requireUser(state, token);
    requireRole(user, 'user');
    const loanId = Number(returnMatch[1]);
    const loan = state.loans.find((l) => l.id === loanId && l.borrower.id === user.id);
    if (!loan) {
      throw new ApiError('Data peminjaman tidak ditemukan.', 404, 'NOT_FOUND');
    }
    if (loan.status === 'returned') {
      throw new ApiError('Buku sudah dikembalikan sebelumnya.', 409, 'CONFLICT');
    }

    loan.status = 'returned';
    loan.returnedAt = new Date().toISOString();
    loan.isOverdue = false;
    loan.daysRemaining = 0;

    const book = state.books.find((b) => b.id === loan.bookId);
    if (book && book.stockAvailable < book.stockTotal) {
      book.stockAvailable += 1;
    }
    saveMockState(state);

    return {
      success: true,
      message: 'Buku berhasil dikembalikan',
      data: toLoanItem(loan),
    } as T;
  }

  // Admin Loans
  if (method === 'GET' && pathname === '/api/v1/admin/loans') {
    const user = requireUser(state, token);
    requireRole(user, 'admin');
    const statusFilter = (searchParams.get('status') ?? 'borrowed') as LoanStatusFilter;
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();
    const page = Number(searchParams.get('page') ?? 1);
    const limit = Number(searchParams.get('limit') ?? 10);

    const filtered = filterLoansByStatus(state.loans, statusFilter).filter((l) => {
      if (!q) return true;
      return (
        l.bookTitle.toLowerCase().includes(q) ||
        l.borrower.name.toLowerCase().includes(q) ||
        (l.borrower.nim ?? '').toLowerCase().includes(q)
      );
    });

    const result = paginate(filtered, page, limit);
    return {
      success: true,
      message: 'Data peminjaman berhasil diambil',
      data: result.items,
      meta: result.meta,
    } as T;
  }

  // Public Books: List
  if (method === 'GET' && pathname === '/api/v1/public-books') {
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();
    const subject = (searchParams.get('subject') ?? 'computer_science').trim().toLowerCase();
    const page = Number(searchParams.get('page') ?? 1);
    const limit = Number(searchParams.get('limit') ?? 10);

    const userReadlist = currentUser ? state.readlistByUser[currentUser.id] ?? [] : [];
    const readlistSet = new Set(userReadlist.map((r) => r.workId));

    const filtered = state.publicBooks
      .filter((book) => {
        if (q) {
          return (
            book.title.toLowerCase().includes(q) ||
            book.authors.some((a) => a.toLowerCase().includes(q))
          );
        }
        if (subject && subject !== 'all') {
          return book.subjects.some((s) => s.toLowerCase() === subject);
        }
        return true;
      })
      .map((b) => ({
        workId: b.workId,
        title: b.title,
        authors: b.authors,
        firstPublishYear: b.firstPublishYear,
        coverUrl: b.coverUrl,
        subjects: b.subjects,
        inReadlist: currentUser ? readlistSet.has(b.workId) : false,
      }));

    const result = paginate(filtered, page, limit);
    return {
      success: true,
      message: 'Buku publik berhasil diambil',
      data: result.items,
      meta: result.meta,
    } as T;
  }

  // Public Books: Detail (lazy)
  const publicBookMatch = pathname.match(/^\/api\/v1\/public-books\/(OL[0-9]+W)$/);
  if (method === 'GET' && publicBookMatch) {
    const workId = publicBookMatch[1];
    const found = state.publicBooks.find((b) => b.workId === workId);
    if (!found) {
      throw new ApiError('Buku publik tidak ditemukan.', 404, 'NOT_FOUND');
    }
    const userReadlist = currentUser ? state.readlistByUser[currentUser.id] ?? [] : [];
    return {
      success: true,
      message: 'Detail buku publik berhasil diambil',
      data: {
        ...found,
        inReadlist: currentUser ? userReadlist.some((r) => r.workId === workId) : false,
      },
    } as T;
  }

  // Readlist: List & Add
  if (pathname === '/api/v1/readlist') {
    const user = requireUser(state, token);
    requireRole(user, 'user');
    const items = state.readlistByUser[user.id] ?? [];

    if (method === 'GET') {
      const q = (searchParams.get('q') ?? '').trim().toLowerCase();
      const page = Number(searchParams.get('page') ?? 1);
      const limit = Number(searchParams.get('limit') ?? 10);

      const filtered = items.filter((item) => {
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.authors.some((a) => a.toLowerCase().includes(q))
        );
      });
      const result = paginate(filtered, page, limit);
      return {
        success: true,
        message: 'Readlist berhasil diambil',
        data: result.items,
        meta: result.meta,
      } as T;
    }

    if (method === 'POST') {
      const { workId } = (body ?? {}) as { workId?: string };
      if (!workId) {
        throw new ApiError('workId wajib diisi.', 400, 'VALIDATION_ERROR');
      }
      if (items.some((r) => r.workId === workId)) {
        throw new ApiError('Buku sudah tersimpan di Readlist.', 409, 'ALREADY_IN_READLIST');
      }
      const source = state.publicBooks.find((b) => b.workId === workId);
      if (!source) {
        throw new ApiError('Buku publik tidak ditemukan.', 404, 'NOT_FOUND');
      }
      const snapshot: ReadlistItem = {
        id: state.nextReadlistId++,
        workId: source.workId,
        title: source.title,
        authors: source.authors,
        firstPublishYear: source.firstPublishYear,
        coverUrl: source.coverUrl,
        description: source.description,
        createdAt: new Date().toISOString(),
      };
      state.readlistByUser[user.id] = [snapshot, ...items];
      saveMockState(state);
      return {
        success: true,
        message: 'Buku berhasil ditambahkan ke readlist',
        data: snapshot,
      } as T;
    }
  }

  // Readlist: Delete
  const readlistDeleteMatch = pathname.match(/^\/api\/v1\/readlist\/(OL[0-9]+W)$/);
  if (method === 'DELETE' && readlistDeleteMatch) {
    const user = requireUser(state, token);
    requireRole(user, 'user');
    const workId = readlistDeleteMatch[1];
    const items = state.readlistByUser[user.id] ?? [];
    const idx = items.findIndex((r) => r.workId === workId);
    if (idx === -1) {
      throw new ApiError('Item Readlist tidak ditemukan.', 404, 'NOT_FOUND');
    }
    items.splice(idx, 1);
    state.readlistByUser[user.id] = items;
    saveMockState(state);
    return {
      success: true,
      message: 'Buku berhasil dihapus dari readlist',
      data: { workId },
    } as T;
  }

  throw new ApiError(`Endpoint mock tidak ditemukan: ${method} ${pathname}`, 404, 'NOT_FOUND');
}

export async function handleMockGraphQL<TData>(
  request: GraphQLRequest,
  token: string | null,
): Promise<TData> {
  const state = loadMockState();
  const currentUser = resolveUserFromToken(state, token);
  const query = request.query;
  const vars = request.variables ?? {};
  const result: Record<string, unknown> = {};

  if (/\blibraryBooks\b/.test(query)) {
    const q = String(vars.q ?? '').trim().toLowerCase();
    const category = String(vars.category ?? '').trim().toLowerCase();
    const availableOnly = Boolean(vars.availableOnly ?? false);
    const page = Number(vars.page ?? 1);
    const limit = Number(vars.limit ?? 10);

    const filtered = state.books
      .filter((b) => {
        if (q) {
          const match =
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            (b.isbn ?? '').toLowerCase().includes(q);
          if (!match) return false;
        }
        if (category && (b.category ?? '').toLowerCase() !== category) return false;
        if (availableOnly && b.stockAvailable <= 0) return false;
        return true;
      })
      .map((b) => enrichLibraryBookForUser(b, state.loans, currentUser));

    const connection: BookConnection = paginate(filtered, page, limit);
    result.libraryBooks = connection;
  }

  if (/\blibraryBook\b/.test(query)) {
    const id = Number(vars.id);
    const found = state.books.find((b) => b.id === id) ?? null;
    result.libraryBook = found ? enrichLibraryBookForUser(found, state.loans, currentUser) : null;
  }

  if (/\bpublicBooks\b/.test(query)) {
    const q = String(vars.q ?? '').trim().toLowerCase();
    const subject = String(vars.subject ?? 'computer_science').trim().toLowerCase();
    const page = Number(vars.page ?? 1);
    const limit = Number(vars.limit ?? 10);
    const userReadlist = currentUser ? state.readlistByUser[currentUser.id] ?? [] : [];
    const readlistSet = new Set(userReadlist.map((r) => r.workId));

    const filtered = state.publicBooks
      .filter((b) => {
        if (q) {
          return (
            b.title.toLowerCase().includes(q) ||
            b.authors.some((a) => a.toLowerCase().includes(q))
          );
        }
        if (subject && subject !== 'all') {
          return b.subjects.some((s) => s.toLowerCase() === subject);
        }
        return true;
      })
      .map((b) => ({
        workId: b.workId,
        title: b.title,
        authors: b.authors,
        firstPublishYear: b.firstPublishYear,
        coverUrl: b.coverUrl,
        subjects: b.subjects,
        inReadlist: currentUser ? readlistSet.has(b.workId) : false,
      }));

    const connection: PublicBookConnection = paginate(filtered, page, limit);
    result.publicBooks = connection;
  }

  if (/\bpublicBookDetail\b/.test(query)) {
    const workId = String(vars.workId ?? '');
    const found = state.publicBooks.find((b) => b.workId === workId) ?? null;
    const userReadlist = currentUser ? state.readlistByUser[currentUser.id] ?? [] : [];
    const detail: PublicBookDetail | null = found
      ? {
          ...found,
          inReadlist: currentUser ? userReadlist.some((r) => r.workId === workId) : false,
        }
      : null;
    result.publicBookDetail = detail;
  }

  if (/\bmyOverview\b/.test(query)) {
    const user = requireUser(state, token);
    requireRole(user, 'user');
    const activeLoans = state.loans
      .filter((l) => l.borrower.id === user.id && l.status === 'borrowed')
      .map(toLoanItem);
    const readlist = state.readlistByUser[user.id] ?? [];
    const overview: UserOverview = {
      activeLoansCount: activeLoans.length,
      overdueLoansCount: activeLoans.filter((l) => l.isOverdue).length,
      readlistCount: readlist.length,
      activeLoans,
      recentReadlist: readlist.slice(0, 5).map((item) => ({
        id: item.id,
        workId: item.workId,
        title: item.title,
        authors: item.authors,
        firstPublishYear: item.firstPublishYear,
        coverUrl: item.coverUrl,
        createdAt: item.createdAt,
      })),
    };
    result.myOverview = overview;
  }

  if (/\badminOverview\b/.test(query)) {
    const user = requireUser(state, token);
    requireRole(user, 'admin');
    const loanStatus = String(vars.loanStatus ?? 'BORROWED').toLowerCase() as LoanStatusFilter;
    const activeLoans = state.loans.filter((l) => l.status === 'borrowed');
    const recentLoans = filterLoansByStatus(state.loans, loanStatus)
      .slice(0, 10)
      .map(toLoanItem);

    const overview: AdminOverview = {
      totalBooks: state.books.length,
      lowStockBooksCount: state.books.filter((b) => b.stockAvailable <= 1).length,
      activeLoansCount: activeLoans.length,
      overdueLoansCount: activeLoans.filter((l) => l.isOverdue).length,
      recentLoans,
    };
    result.adminOverview = overview;
  }

  return result as TData;
}
