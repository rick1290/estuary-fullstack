import type { CreateClientConfig } from '@hey-api/client-next';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    ...config.headers,
    'Content-Type': 'application/json',
  },
  auth: {
    type: 'bearer',
  },
});

// Helper function to set auth token
export const setAuthToken = (token: string | null) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }
};

// Helper function to get auth token
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};