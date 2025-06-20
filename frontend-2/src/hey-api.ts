import type { CreateClientConfig } from './client/client.gen';
import { AuthService } from '@/lib/auth-service';

// Simple JWT token validation - checks if token is not expired
function isTokenValid(token: string): boolean {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    return payload.exp > now;
  } catch {
    return false;
  }
}

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
        const url = new URL(request.url);
        
        // Only add auth header for endpoints that require authentication
        // Public endpoints (services, practitioners, etc.) should work without auth
        const publicEndpoints = [
          '/api/v1/services/',
          '/api/v1/practitioners/',
          '/api/v1/service-categories/',
        ];
        
        const isPublicEndpoint = publicEndpoints.some(endpoint => url.pathname.startsWith(endpoint));
        
        // For public endpoints, only add auth if we have a VALID token
        // For private endpoints, always add auth if available
        if (token && (!isPublicEndpoint || isTokenValid(token))) {
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
            const url = new URL(error.request?.url || '');
            const publicEndpoints = [
              '/api/v1/services/',
              '/api/v1/practitioners/',
              '/api/v1/service-categories/',
            ];
            
            const isPublicEndpoint = publicEndpoints.some(endpoint => url.pathname.startsWith(endpoint));
            
            // For public endpoints, if we get 401, try the request without auth
            if (isPublicEndpoint) {
              try {
                const newRequest = error.request.clone();
                newRequest.headers.delete('Authorization');
                return fetch(newRequest);
              } catch (retryError) {
                // If retry without auth also fails, continue with normal error handling
              }
            }
            
            // For private endpoints or if public endpoint retry failed, try token refresh
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