import { apiClient } from '../lib/api-client';
import type { ApiSuccessResponse } from '../types/api';
import type {
  AuthPayload,
  LoginRequest,
  RegisterRequest,
  UserProfile,
} from '../types/domain';

export const authService = {
  async login(payload: LoginRequest): Promise<AuthPayload> {
    const res = await apiClient.post<ApiSuccessResponse<AuthPayload>>(
      '/api/v1/auth/login',
      payload,
      { skipUnauthorizedHandler: true },
    );
    return res.data;
  },

  async register(payload: RegisterRequest): Promise<AuthPayload> {
    const res = await apiClient.post<ApiSuccessResponse<AuthPayload>>(
      '/api/v1/auth/register',
      payload,
    );
    return res.data;
  },

  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<ApiSuccessResponse<UserProfile>>('/api/v1/auth/me');
    return res.data;
  },
};
