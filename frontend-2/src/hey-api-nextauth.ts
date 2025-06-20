import type { CreateClientConfig } from './client/client.gen';
import { getSession } from 'next-auth/react';

export const createClientConfig: CreateClientConfig = (config) => {
  // Create the base configuration
  // Always use localhost for client-side requests
  const baseConfig = {
    ...config,
    baseUrl: typeof window !== 'undefined' 
      ? 'http://localhost:8000'  // Client-side: use localhost
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'), // Server-side: can use Docker service name
  };

  // Add auth interceptor after client is created
  if (typeof window !== 'undefined') {
    // We're in the browser, so we can set up interceptors
    setTimeout(() => {
      const { client } = require('./client/client.gen');
      
      // Add request interceptor for auth
      client.interceptors.request.use(async (request: Request) => {
        // Force session refresh to get latest token
        const session = await getSession();
        
        // Check if token is expired
        if (session?.accessTokenExpires && Date.now() >= session.accessTokenExpires) {
          // Token is expired, trigger a session refresh
          // NextAuth should handle this automatically in the JWT callback
          console.warn('Access token expired, refreshing session...');
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
            console.warn('Received 401 error, token might be invalid');
            
            // Try to get a fresh session
            const { signIn } = await import('next-auth/react');
            const session = await getSession();
            
            // If we have a refresh token, NextAuth should handle the refresh
            // If not, we might need to re-authenticate
            if (!session || session.error === "RefreshAccessTokenError") {
              // Redirect to login or show auth modal
              if (typeof window !== 'undefined') {
                window.location.href = '/auth/signin';
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