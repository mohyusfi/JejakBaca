import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSchema, graphql, GraphQLError, Kind } from 'graphql';
import { getDb } from '../app/database.js';
import { AppError, NotFoundError } from '../middleware/errorHandler.js';
import { bookService } from './book.service.js';
import { publicBookService } from './publicBook.service.js';
import { formatLoanItem, loanService } from './loan.service.js';
import { formatReadlistItem } from './readlist.service.js';

const LOW_STOCK_THRESHOLD = 2;
const OVERVIEW_RECENT_LIMIT = 5;

let cachedSchema = null;

/**
 * Mencari path berkas docs/api/schema.graphql
 * @returns {string | null}
 */
function findSchemaPath() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(currentDir, '../../../docs/api/schema.graphql'),
    path.resolve(process.cwd(), 'docs/api/schema.graphql'),
    path.resolve(process.cwd(), '../docs/api/schema.graphql'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Memuat dan membangun GraphQLSchema dari docs/api/schema.graphql (di-cache)
 * @returns {import('graphql').GraphQLSchema}
 */
export function getGraphQLSchema() {
  if (cachedSchema) {
    return cachedSchema;
  }

  const schemaPath = findSchemaPath();
  if (!schemaPath) {
    throw new Error('Berkas skema GraphQL (docs/api/schema.graphql) tidak ditemukan');
  }

  const sdl = fs.readFileSync(schemaPath, 'utf-8');
  cachedSchema = buildSchema(sdl);
  return cachedSchema;
}

/**
 * Memastikan konteks memiliki JWT dengan peran yang sesuai
 * @param {{ user: object | null }} context
 * @param {'user' | 'admin'} requiredRole
 * @returns {object}
 */
function requireGraphQLRole(context, requiredRole) {
  if (!context?.user) {
    throw new GraphQLError('Autentikasi diperlukan untuk mengakses query ini', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  if (context.user.role !== requiredRole) {
    throw new GraphQLError('Akses ditolak: peran Anda tidak memiliki izin untuk query ini', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  return context.user;
}

/**
 * Menerjemahkan AppError dari service menjadi GraphQLError yang terstruktur
 * @param {unknown} err
 * @returns {never}
 */
function rethrowAsGraphQLError(err) {
  if (err instanceof GraphQLError) {
    throw err;
  }

  if (err instanceof AppError) {
    const extensions = { code: err.code };
    if (err.details) {
      extensions.details = err.details;
    }
    throw new GraphQLError(err.message, { extensions });
  }

  throw err;
}

/**
 * Memeriksa apakah argumen `subject` diberikan secara eksplisit oleh pemanggil GraphQL
 * @param {import('graphql').GraphQLResolveInfo} info
 * @returns {boolean}
 */
function hasExplicitSubjectArgument(info) {
  const fieldNode = info?.fieldNodes?.[0];
  if (!fieldNode?.arguments) {
    return false;
  }

  const subjectArg = fieldNode.arguments.find((arg) => arg.name.value === 'subject');
  if (!subjectArg) {
    return false;
  }

  if (subjectArg.value.kind === Kind.VARIABLE) {
    const varName = subjectArg.value.name.value;
    return (
      Boolean(info.variableValues) &&
      Object.prototype.hasOwnProperty.call(info.variableValues, varName) &&
      info.variableValues[varName] !== undefined
    );
  }

  return true;
}

const rootValue = {
  /**
   * Mengambil daftar Buku Perpustakaan UNTAD (Tamu / User / Admin)
   */
  libraryBooks(args = {}, context = {}) {
    const userId = context.user?.role === 'user' ? (context.user.sub || context.user.id) : null;
    try {
      return bookService.getBooks(
        {
          q: args.q,
          category: args.category,
          availableOnly: args.availableOnly,
          page: args.page,
          limit: args.limit,
        },
        userId
      );
    } catch (err) {
      rethrowAsGraphQLError(err);
    }
  },

  /**
   * Mengambil detail satu Buku Perpustakaan UNTAD (Tamu / User / Admin)
   */
  libraryBook(args = {}, context = {}) {
    const userId = context.user?.role === 'user' ? (context.user.sub || context.user.id) : null;
    try {
      return bookService.getBookById(args.id, userId);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return null;
      }
      rethrowAsGraphQLError(err);
    }
  },

  /**
   * Mengambil daftar Buku Publik melalui proxy Open Library (Tamu / User / Admin)
   */
  async publicBooks(args = {}, context = {}, info) {
    const hasQuery = typeof args.q === 'string' && args.q.trim().length > 0;
    const effectiveSubject =
      hasQuery && !hasExplicitSubjectArgument(info) ? '' : (args.subject ?? '');

    try {
      return await publicBookService.searchPublicBooks(
        {
          q: args.q,
          subject: effectiveSubject,
          page: args.page,
          limit: args.limit,
        },
        context.user || null
      );
    } catch (err) {
      rethrowAsGraphQLError(err);
    }
  },

  /**
   * Mengambil detail & deskripsi satu Buku Publik secara lazy (Tamu / User / Admin)
   */
  async publicBookDetail(args = {}, context = {}) {
    try {
      return await publicBookService.getPublicBookById(args.workId, context.user || null);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return null;
      }
      rethrowAsGraphQLError(err);
    }
  },

  /**
   * Ringkasan dashboard khusus User terautentikasi (Wajib JWT role user)
   */
  myOverview(_args, context = {}) {
    const user = requireGraphQLRole(context, 'user');
    const userId = Number(user.sub || user.id);
    const db = getDb();
    const now = new Date();

    const activeLoanRows = db
      .prepare(`
        SELECT
          loans.id,
          loans.book_id,
          books.title AS book_title,
          books.author AS book_author,
          books.cover_url AS book_cover_url,
          loans.status,
          loans.borrowed_at,
          loans.due_date,
          loans.returned_at
        FROM loans
        JOIN books ON books.id = loans.book_id
        WHERE loans.user_id = ? AND loans.status = 'borrowed'
        ORDER BY loans.borrowed_at DESC, loans.id DESC;
      `)
      .all(userId);

    const activeLoans = activeLoanRows.map((row) => formatLoanItem(row, now));
    const activeLoansCount = activeLoans.length;
    const overdueLoansCount = activeLoans.filter((loan) => loan.isOverdue).length;

    const readlistCountRow = db
      .prepare('SELECT COUNT(*) AS total FROM readlist_items WHERE user_id = ?;')
      .get(userId);
    const readlistCount = readlistCountRow ? Number(readlistCountRow.total) : 0;

    const recentReadlistRows = db
      .prepare(`
        SELECT * FROM readlist_items
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?;
      `)
      .all(userId, OVERVIEW_RECENT_LIMIT);

    const recentReadlist = recentReadlistRows.map(formatReadlistItem);

    return {
      activeLoansCount,
      overdueLoansCount,
      readlistCount,
      activeLoans,
      recentReadlist,
    };
  },

  /**
   * Ringkasan & statistik khusus Admin terautentikasi (Wajib JWT role admin)
   */
  adminOverview(args = {}, context = {}) {
    requireGraphQLRole(context, 'admin');
    const db = getDb();
    const now = new Date();
    const nowIso = now.toISOString();

    const totalBooksRow = db
      .prepare('SELECT COUNT(*) AS total FROM books WHERE deleted_at IS NULL;')
      .get();
    const totalBooks = totalBooksRow ? Number(totalBooksRow.total) : 0;

    const lowStockRow = db
      .prepare(
        'SELECT COUNT(*) AS total FROM books WHERE deleted_at IS NULL AND stock_available <= ?;'
      )
      .get(LOW_STOCK_THRESHOLD);
    const lowStockBooksCount = lowStockRow ? Number(lowStockRow.total) : 0;

    const activeLoansRow = db
      .prepare("SELECT COUNT(*) AS total FROM loans WHERE status = 'borrowed';")
      .get();
    const activeLoansCount = activeLoansRow ? Number(activeLoansRow.total) : 0;

    const overdueLoansRow = db
      .prepare("SELECT COUNT(*) AS total FROM loans WHERE status = 'borrowed' AND due_date < ?;")
      .get(nowIso);
    const overdueLoansCount = overdueLoansRow ? Number(overdueLoansRow.total) : 0;

    const loanStatus = String(args.loanStatus || 'BORROWED').toLowerCase();
    const { items: recentLoans } = loanService.getAdminLoans({
      status: loanStatus,
      page: 1,
      limit: OVERVIEW_RECENT_LIMIT,
    });

    return {
      totalBooks,
      lowStockBooksCount,
      activeLoansCount,
      overdueLoansCount,
      recentLoans,
    };
  },
};

export const graphqlService = {
  /**
   * Mengeksekusi query GraphQL menggunakan paket `graphql` secara langsung
   * @param {{ query: string, variables?: Record<string, any> | null, operationName?: string | null }} payload
   * @param {{ user?: object | null }} [contextValue]
   * @returns {Promise<import('graphql').ExecutionResult>}
   */
  async executeQuery({ query, variables = undefined, operationName = undefined }, contextValue = {}) {
    const schema = getGraphQLSchema();
    return graphql({
      schema,
      source: query,
      rootValue,
      contextValue: { user: contextValue.user || null },
      variableValues: variables ?? undefined,
      operationName: operationName ?? undefined,
    });
  },
};

export default graphqlService;
