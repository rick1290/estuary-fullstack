'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { AuthModalProviderWrapper } from '@/components/auth/auth-modal-provider-wrapper';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider
        // Refresh session every 4 minutes - this is the ONLY refresh mechanism
        // NextAuth will handle token refresh internally when session is fetched
        refetchInterval={4 * 60}
        refetchOnWindowFocus={true}
      >
      <QueryClientProvider client={queryClient}>
        <AuthModalProviderWrapper>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#FAF3E0',
                color: '#5C5346',
                border: '1px solid #E8DFD0',
              },
              className: 'sonner-toast',
              classNames: {
                success: 'bg-sage-50 border-sage-200 text-sage-800',
                error: 'bg-red-50 border-red-200 text-red-800',
              },
            }}
          />
        </AuthModalProviderWrapper>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </SessionProvider>
  );
}