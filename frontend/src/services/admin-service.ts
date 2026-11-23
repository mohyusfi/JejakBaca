import { graphqlRequest } from '../lib/graphql-client';
import type { AdminOverview } from '../types/domain';

const ADMIN_OVERVIEW_QUERY = /* GraphQL */ `
  query AdminOverview {
    adminOverview {
      totalBooks
      lowStockBooksCount
      activeLoansCount
      overdueLoansCount
    }
  }
`;

export const adminService = {
  async getOverview(signal?: AbortSignal): Promise<AdminOverview> {
    const data = await graphqlRequest<{ adminOverview: AdminOverview }>({
      query: ADMIN_OVERVIEW_QUERY,
      operationName: 'AdminOverview',
      signal,
    });
    return data.adminOverview;
  },
};
