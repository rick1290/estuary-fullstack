import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import type { UserProfileReadable } from "@/src/client/types.gen"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
    user: UserProfileReadable & {
      id: string
      email: string
      name?: string | null
      image?: string | null
    }
  }

  interface User extends UserProfileReadable {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    user?: UserProfileReadable
    error?: string
  }
}

// Get the API URL based on environment
const getApiUrl = () => {
  // Use INTERNAL_API_URL for server-side API calls (Docker internal hostname)
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL
  }

  // Fallback to NEXT_PUBLIC_API_URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // Default to localhost for local development
  return 'http://localhost:8000'
}

/**
 * Refresh the access token using the refresh token.
 * This is the ONLY place token refresh should happen.
 */
async function refreshAccessToken(token: any): Promise<any> {
  // Don't attempt refresh if we don't have a refresh token
  if (!token.refreshToken) {
    console.error("[NextAuth] No refresh token available")
    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }

  const apiUrl = getApiUrl()
  console.log("[NextAuth] Refreshing access token...")

  try {
    const response = await fetch(`${apiUrl}/api/v1/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: token.refreshToken })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[NextAuth] Token refresh failed: ${response.status} - ${errorText}`)

      // If refresh token is invalid/expired (401/403), user needs to re-authenticate
      if (response.status === 401 || response.status === 403) {
        return {
          ...token,
          error: "RefreshAccessTokenError",
          accessToken: undefined,
          refreshToken: undefined,
          accessTokenExpires: undefined,
        }
      }

      // For other errors (network, 500, etc.), keep the current token
      // and let the client retry later
      console.warn("[NextAuth] Non-auth error during refresh, keeping current token")
      return token
    }

    const data = await response.json()

    if (data && data.access) {
      console.log("[NextAuth] Token refreshed successfully")
      return {
        ...token,
        accessToken: data.access,
        // IMPORTANT: Update refresh token if backend rotates it
        refreshToken: data.refresh || token.refreshToken,
        accessTokenExpires: Date.now() + 30 * 60 * 1000, // 30 minutes
        error: undefined, // Clear any previous errors
      }
    }

    console.error("[NextAuth] Invalid refresh response format")
    return token

  } catch (error) {
    console.error("[NextAuth] Refresh token error:", error)
    // On network errors, keep the current token and let client retry
    return token
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const apiUrl = getApiUrl()
          console.log("[NextAuth] Login attempt for:", credentials.email)

          const response = await fetch(`${apiUrl}/api/v1/auth/login/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password
            })
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error("[NextAuth] Login failed:", response.status, errorText)
            return null
          }

          const data = await response.json()

          if (data) {
            const { access_token, refresh_token, expires_in, user } = data

            console.log("[NextAuth] Login successful for:", credentials.email)

            return {
              ...user,
              id: user?.id?.toString() || "",
              email: user?.email || credentials.email,
              name: user ? `${user.first_name} ${user.last_name}`.trim() : null,
              image: null,
              accessToken: access_token,
              refreshToken: refresh_token,
              accessTokenExpires: Date.now() + (expires_in || 30 * 60) * 1000
            } as any
          }

          return null
        } catch (error) {
          console.error("[NextAuth] Login error:", error)
          return null
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // Initial sign in - store tokens from login response
      if (account && user) {
        if (account.provider === "credentials") {
          return {
            ...token,
            accessToken: (user as any).accessToken,
            refreshToken: (user as any).refreshToken,
            accessTokenExpires: (user as any).accessTokenExpires,
            user: user as UserProfileReadable,
            error: undefined,
          }
        } else if (account.provider === "google") {
          // TODO: Implement Google token exchange with Django backend
        }
      }

      // If there's already an error, don't try to refresh again
      // Let the client handle it (retry or logout)
      if (token.error === "RefreshAccessTokenError") {
        return token
      }

      // Handle explicit update trigger (e.g., after profile update)
      if (trigger === "update" && token.accessToken) {
        console.log("[NextAuth] Update trigger - fetching fresh user data")
        try {
          const apiUrl = getApiUrl()
          const response = await fetch(`${apiUrl}/api/v1/auth/me/`, {
            headers: {
              'Authorization': `Bearer ${token.accessToken}`,
            },
          })

          if (response.ok) {
            const freshUserData = await response.json()
            return {
              ...token,
              user: freshUserData,
            }
          } else if (response.status === 401) {
            // Token might be expired, try to refresh
            console.log("[NextAuth] Token expired during update, refreshing...")
            return refreshAccessToken(token)
          }
        } catch (error) {
          console.error("[NextAuth] Error fetching user data:", error)
        }
      }

      // Check if access token needs refresh
      // Refresh 5 minutes before expiration to avoid edge cases
      const fiveMinutes = 5 * 60 * 1000
      const tokenExpires = token.accessTokenExpires as number

      if (tokenExpires && Date.now() >= tokenExpires - fiveMinutes) {
        console.log("[NextAuth] Token expiring soon, refreshing...")
        return refreshAccessToken(token)
      }

      // Token is still valid
      return token
    },

    async session({ session, token }) {
      // Pass error to session so client can handle it
      if (token.error) {
        return {
          ...session,
          error: token.error,
          accessToken: undefined,
          refreshToken: undefined,
          accessTokenExpires: undefined,
        }
      }

      // Pass token data to session
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      session.accessTokenExpires = token.accessTokenExpires

      // Merge user data from token
      if (token.user) {
        session.user = {
          ...session.user,
          ...token.user,
          id: (token.user as any).id?.toString() || "",
          email: (token.user as any).email || session.user?.email || "",
        } as any
      }

      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
