import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services/admin-service';

export const adminKeys = {
  all: ['graphql', 'adminOverview'] as const,
};

/**
 * Hook GraphQL `adminOverview` untuk strip ringkasan metrik di Workspace Admin.
 */
export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.all,
    queryFn: ({ signal }) => adminService.getOverview(signal),
  });
}
