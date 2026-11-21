import { QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AppShell } from '../components/layout/AppShell';
import { AuthProvider } from '../components/layout/AuthProvider';
import { ToastProvider } from '../components/ui/Toast';
import { queryClient } from '../lib/query-client';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
