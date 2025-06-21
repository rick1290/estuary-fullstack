import { client } from '@/src/client/client.gen'
import { authLogin, authLogout, authRefresh, authMe } from '@/src/client/sdk.gen'
import type { UserLoginRequest, TokenResponseReadable, UserProfileReadable } from '@/src/client/types.gen'

const ACCESS_TOKEN_KEY = 'estuary_access_token'
const REFRESH_TOKEN_KEY = 'estuary_refresh_token'

export class AuthService {
  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  static setTokens(tokens: TokenResponseReadable): void {
    if (tokens.access_token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
    }
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
    }
  }

  static clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  static async login(credentials: UserLoginRequest): Promise<{ tokens: TokenResponseReadable; user: UserProfileReadable }> {
    console.log('AuthService.login called with:', credentials)
    try {
      console.log('Calling authLogin API...')
      console.log('Request body:', credentials)
      console.log('Client config:', client.getConfig())
      
      const response = await authLogin({ 
        body: credentials
      })
      console.log('Login response:', response)
      console.log('Response status:', response.status)
      console.log('Response data:', response.data)
      console.log('Response error:', response.error)
      
      if (response.data) {
        this.setTokens(response.data)
        
        // Set the access token in the client for subsequent requests
        client.setConfig({
          headers: {
            Authorization: `Bearer ${response.data.access_token}`
          }
        })
        
        // Fetch user data
        const userResponse = await authMe({ client })
        
        if (userResponse.data) {
          return {
            tokens: response.data,
            user: userResponse.data
          }
        }
      }
      
      throw new Error('Login failed - no data in response')
    } catch (error: any) {
      console.error('Login error details:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.data)
      this.clearTokens()
      
      // Try to extract meaningful error message
      if (error?.error?.message) {
        throw new Error(error.error.message)
      } else if (error?.message) {
        throw error
      } else {
        throw new Error('Login failed')
      }
    }
  }

  static async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken()
    
    if (refreshToken) {
      try {
        await authLogout({ client })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    
    this.clearTokens()
    client.setConfig({
      headers: {}
    })
  }

  static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken()
    
    if (!refreshToken) {
      return null
    }
    
    try {
      const response = await authRefresh({ 
        body: { refresh: refreshToken },
        client 
      })
      
      // The refresh endpoint returns {access: "token"} format
      if (response.data && typeof response.data === 'object' && 'access' in response.data) {
        const accessToken = (response.data as any).access
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
        
        // Update the client with new token
        client.setConfig({
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })
        
        return accessToken
      }
    } catch (error) {
      this.clearTokens()
      throw error
    }
    
    return null
  }

  static async getCurrentUser(): Promise<UserProfileReadable | null> {
    const accessToken = this.getAccessToken()
    
    if (!accessToken) {
      return null
    }
    
    try {
      // Ensure token is set in client
      client.setConfig({
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      
      const response = await authMe({ client })
      return response.data || null
    } catch (error) {
      // If 401, try to refresh token
      if ((error as any)?.response?.status === 401) {
        try {
          await this.refreshAccessToken()
          const retryResponse = await authMe({ client })
          return retryResponse.data || null
        } catch (refreshError) {
          this.clearTokens()
          return null
        }
      }
      
      throw error
    }
  }

  static initializeAuth(): void {
    const accessToken = this.getAccessToken()
    
    if (accessToken) {
      client.setConfig({
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    }
  }
}

// Initialize auth on module load
if (typeof window !== 'undefined') {
  AuthService.initializeAuth()
}