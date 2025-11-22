import type { CreateClientConfig } from './client/client.gen';
import { getSession } from 'next-auth/react';

export const createClientConfig: CreateClientConfig = (config) => {
  // Use NEXT_PUBLIC_API_URL for client-side, INTERNAL_API_URL for server-side
  const isServer = typeof window === 'undefined';
  const apiUrl = isServer
    ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

  const baseConfig = {
    ...config,
    baseUrl: apiUrl,
  };

  // Add auth interceptor after client is created (browser only)
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      const { client } = require('./client/client.gen');

      // Request interceptor - ONLY adds Authorization header
      // Does NOT trigger token refresh - that's handled by SessionProvider
      client.interceptors.request.use(async (request: Request) => {
        const session = await getSession();

        if (session?.accessToken) {
          request.headers.set('Authorization', `Bearer ${session.accessToken}`);
        }

        return request;
      });

      // Response interceptor - handles data unwrapping and 401 errors
      client.interceptors.response.use(
        async (response: Response) => {
          // Clone the response to read the body
          const clonedResponse = response.clone();
          try {
            const data = await clonedResponse.json();
            // Check if response has the status/data wrapper
            if (data && typeof data === 'object' && 'status' in data && 'data' in data) {
              // Create a new response with unwrapped data
              return new Response(JSON.stringify(data.data), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              });
            }
          } catch (e) {
            // If parsing fails, return original response
          }
          return response;
        },
        async (error: any) => {
          // On 401, emit an event - don't try to refresh here
          // SessionProvider will handle refresh on next interval
          if (error instanceof Response && error.status === 401) {
            console.warn('API returned 401 - session may have expired');

            // Emit event for the app to handle (show login modal, etc.)
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            }
          }
          throw error;
        }
      );
    }, 0);
  }

  return baseConfig;
};
