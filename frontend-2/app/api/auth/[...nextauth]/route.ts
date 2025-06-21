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

async function refreshAccessToken(token: any) {
  try {
    // Don't attempt refresh if we don't have a refresh token
    if (!token.refreshToken) {
      console.error("No refresh token available")
      return {
        ...token,
        error: "RefreshAccessTokenError",
      }
    }
    
    const apiUrl = getApiUrl()
    console.log("Attempting to refresh token...")
    
    const response = await fetch(`${apiUrl}/api/v1/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: token.refreshToken })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Token refresh failed with status ${response.status}: ${errorText}`)
      
      // If refresh token is invalid (401), we need to log the user out
      if (response.status === 401 || response.status === 403) {
        return {
          ...token,
          error: "RefreshAccessTokenError",
          accessToken: undefined,
          refreshToken: undefined,
          accessTokenExpires: undefined,
        }
      }
      
      throw new Error(`Failed to refresh token: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data && data.access) {
      console.log("Token refreshed successfully")
      return {
        ...token,
        accessToken: data.access,
        accessTokenExpires: Date.now() + 30 * 60 * 1000, // 30 minutes
        error: undefined, // Clear any previous errors
      }
    }
    
    throw new Error("Invalid refresh response format")
  } catch (error) {
    console.error("RefreshAccessTokenError:", error)
    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
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
          console.log("NextAuth: Attempting login with API URL:", apiUrl)
          console.log("NextAuth: Credentials email:", credentials.email)
          
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
          
          console.log("NextAuth: Response status:", response.status)
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error("Login failed with status:", response.status, "Error:", errorText)
            return null
          }
          
          const data = await response.json()
          
          if (data) {
            const { access_token, refresh_token, expires_in, user } = data
            
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
          console.error("Login error:", error)
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
      // Initial sign in
      if (account && user) {
        if (account.provider === "credentials") {
          return {
            ...token,
            accessToken: (user as any).accessToken,
            refreshToken: (user as any).refreshToken,
            accessTokenExpires: (user as any).accessTokenExpires,
            user: user as UserProfileReadable
          }
        } else if (account.provider === "google") {
          // TODO: Call Django backend to exchange Google token for Django JWT
          // For now, we'll need to implement a Django endpoint that accepts Google tokens
          // and creates/updates a user, returning Django JWT tokens
        }
      }
      
      // Force refresh if explicitly triggered (e.g., from getSession({ req: { headers: {} } }))
      if (trigger === "update" && token.refreshToken) {
        console.log("Force refreshing token due to update trigger");
        return refreshAccessToken(token);
      }
      
      // Return previous token if the access token has not expired yet
      // Add a 5 minute buffer to ensure we refresh before actual expiration
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() < ((token.accessTokenExpires as number) - fiveMinutes)) {
        return token
      }
      
      // Access token has expired or is about to expire, try to update it
      console.log("Token expired or expiring soon, refreshing...");
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      if (token) {
        // Check for refresh errors
        if (token.error === "RefreshAccessTokenError") {
          // Return an error session that the client can handle
          return {
            ...session,
            error: "RefreshAccessTokenError",
            accessToken: undefined,
            refreshToken: undefined,
            accessTokenExpires: undefined,
          }
        }
        
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
          }
        }
      }
      
      return session
    }
  },
  pages: {
    signIn: "/auth/signin", // We'll redirect to the modal instead
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