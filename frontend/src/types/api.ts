export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'LOAN_LIMIT_EXCEEDED'
  | 'DUPLICATE_ACTIVE_LOAN'
  | 'OUT_OF_STOCK'
  | 'BOOK_IN_ACTIVE_LOAN'
  | 'STOCK_BELOW_BORROWED'
  | 'ALREADY_IN_READLIST'
  | 'UPSTREAM_API_ERROR'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'GRAPHQL_ERROR';

export interface ApiErrorFieldDetail {
  field: string;
  message: string;
}

export interface ApiErrorDetail {
  code: ApiErrorCode;
  details?: ApiErrorFieldDetail[];
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: ApiErrorDetail;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  message: string;
  data: T[];
  meta: PaginationMeta;
}

export interface GraphQLErrorItem {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<TData> {
  data: TData | null;
  errors?: GraphQLErrorItem[];
}

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string | null;
}
