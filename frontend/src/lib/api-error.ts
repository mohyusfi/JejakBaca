import type { ApiErrorCode, ApiErrorFieldDetail, ApiErrorResponse } from '../types/api';

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: ApiErrorFieldDetail[];

  constructor(
    message: string,
    status: number,
    code: ApiErrorCode,
    details?: ApiErrorFieldDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as Partial<ApiErrorResponse>;
  return (
    candidate.success === false &&
    typeof candidate.message === 'string' &&
    typeof candidate.error === 'object' &&
    candidate.error !== null &&
    typeof candidate.error.code === 'string'
  );
}
