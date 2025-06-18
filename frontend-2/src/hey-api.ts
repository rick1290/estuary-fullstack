import type { CreateClientConfig } from './client/client.gen';
import { AuthService } from '@/lib/auth-service';

export const createClientConfig: CreateClientConfig = (config) => {
  // Create the base configuration
  const baseConfig = {
    ...config,
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  };

  // Add auth interceptor after client is created
  if (typeof window !== 'undefined') {
    // We're in the browser, so we can set up interceptors
    setTimeout(() => {
      const { client } = require('./client/client.gen');
      
      // Add request interceptor for auth
      client.interceptors.request.use((request: Request) => {
        const token = AuthService.getAccessToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
        return request;
      });

      // Add response interceptor for token refresh and data unwrapping
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
          if (error.status === 401) {
            try {
              const newToken = await AuthService.refreshAccessToken();
              if (newToken) {
                // Clone the request and retry with new token
                const newRequest = error.request.clone();
                newRequest.headers.set('Authorization', `Bearer ${newToken}`);
                return fetch(newRequest);
              }
            } catch (refreshError) {
              // Refresh failed, clear tokens
              AuthService.clearTokens();
            }
          }
          throw error;
        }
      );
    }, 0);
  }

  return baseConfig;
};