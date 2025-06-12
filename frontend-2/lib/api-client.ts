// API Client configuration for Estuary backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface ApiOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  async request<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    const authToken = token || this.token;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string) {
    return this.request('/api/v1/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: any) {
    return this.request('/api/v1/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(refreshToken: string) {
    return this.request('/api/v1/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getMe() {
    return this.request('/api/v1/auth/me/');
  }

  // Practitioners
  async getPractitioners(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/api/v1/practitioners/${queryString}`);
  }

  async getPractitioner(id: string) {
    return this.request(`/api/v1/practitioners/${id}/`);
  }

  // Services
  async getServices(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/api/v1/services/${queryString}`);
  }

  async getService(id: string) {
    return this.request(`/api/v1/services/${id}/`);
  }

  // Bookings
  async getBookings(params?: any) {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/api/v1/bookings/${queryString}`);
  }

  async createBooking(bookingData: any) {
    return this.request('/api/v1/bookings/', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  // WebSocket connection helper
  createWebSocket(path: string): WebSocket {
    const wsUrl = `${WS_BASE_URL}${path}`;
    return new WebSocket(wsUrl);
  }
}

export const apiClient = new ApiClient();
export default apiClient;