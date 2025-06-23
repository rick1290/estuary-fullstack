import type { CreateClientConfig } from './client/client.gen';
import { getSession } from 'next-auth/react';

// Track if we're currently refreshing to avoid multiple refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;
let lastRefreshTime = 0;

export const createClientConfig: CreateClientConfig = (config) => {
  // Create the base configuration
  // Use NEXT_PUBLIC_API_URL for client-side, INTERNAL_API_URL for server-side
  const isServer = typeof window === 'undefined';
  const apiUrl = isServer 
    ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
  
  const baseConfig = {
    ...config,
    baseUrl: apiUrl,
  };

  // Add auth interceptor after client is created
  if (typeof window !== 'undefined') {
    // We're in the browser, so we can set up interceptors
    setTimeout(() => {
      const { client } = require('./client/client.gen');
      
      // Add request interceptor for auth
      client.interceptors.request.use(async (request: Request) => {
        // Get the current session
        let session = await getSession();
        
        // Check if token is expired or about to expire (within 2 minutes for interceptor)
        // We use a shorter time than token monitor to avoid conflicts
        if (session?.accessTokenExpires) {
          const now = Date.now();
          const tokenExpiresIn = session.accessTokenExpires - now;
          const twoMinutes = 2 * 60 * 1000;
          const thirtySeconds = 30 * 1000;
          
          // Only refresh if we haven't refreshed recently (within 30 seconds)
          const timeSinceLastRefresh = now - lastRefreshTime;
          
          if (tokenExpiresIn <= twoMinutes && timeSinceLastRefresh > thirtySeconds) {
            console.log('API interceptor: Access token expiring soon, checking if refresh needed...');
            
            // If we're not already refreshing, start a refresh
            if (!isRefreshing) {
              isRefreshing = true;
              lastRefreshTime = now;
              refreshPromise = getSession(); // Let NextAuth handle the refresh
              
              try {
                session = await refreshPromise;
                if (session?.accessToken) {
                  console.log('API interceptor: Token refreshed successfully');
                }
              } catch (error) {
                console.error('API interceptor: Failed to refresh token:', error);
              } finally {
                isRefreshing = false;
                refreshPromise = null;
              }
            } else if (refreshPromise) {
              // If already refreshing, wait for the existing refresh
              console.log('API interceptor: Waiting for ongoing refresh...');
              session = await refreshPromise;
            }
          }
        }
        
        if (session?.accessToken) {
          request.headers.set('Authorization', `Bearer ${session.accessToken}`);
        }
        return request;
      });

      // Add response interceptor for data unwrapping
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
          // Check if it's a 401 error (unauthorized)
          if (error instanceof Response && error.status === 401) {
            console.warn('Received 401 error, attempting to refresh token...');
            
            // Clone the original request
            const originalRequest = (error as any).request;
            
            // Avoid infinite loops - don't retry if this is already a retry
            if (!originalRequest || originalRequest.headers.get('X-Retry-After-401')) {
              throw error;
            }
            
            try {
              // Try to get a fresh session
              const newSession = await getSession();
              
              if (newSession?.accessToken && !newSession.error) {
                console.log('Token refreshed after 401, retrying request...');
                
                // Clone the request and add new token
                const retryRequest = originalRequest.clone();
                retryRequest.headers.set('Authorization', `Bearer ${newSession.accessToken}`);
                retryRequest.headers.set('X-Retry-After-401', 'true');
                
                // Retry the request
                return await fetch(retryRequest);
              } else {
                console.error('No valid session after refresh attempt');
                // Emit an event instead of immediately signing out
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('auth:refresh-failed'));
                }
              }
            } catch (refreshError) {
              console.error('Failed to refresh token after 401:', refreshError);
              
              // Emit an event instead of immediately signing out
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:refresh-failed'));
              }
            }
          }
          throw error;
        }
      );
    }, 0);
  }

  return baseConfig;
};