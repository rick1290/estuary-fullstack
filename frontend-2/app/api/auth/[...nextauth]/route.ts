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
  // When running in Docker, use the service name
  // Check if we're in a Docker environment by looking at the hostname
  if (process.env.HOSTNAME && process.env.HOSTNAME.includes('estuary-fullstack')) {
    return 'http://admin:8000'
  }
  // Or check if the API URL contains the Docker service name
  if (process.env.NEXT_PUBLIC_API_URL === 'http://admin:8000') {
    return 'http://admin:8000'
  }
  // In production or when explicitly set, use the environment variable
  if (process.env.NEXTAUTH_URL_INTERNAL) {
    return process.env.NEXTAUTH_URL_INTERNAL
  }
  // Default to localhost for local development
  return 'http://localhost:8000'
}

async function refreshAccessToken(token: any) {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/v1/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: token.refreshToken })
    })
    
    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }
    
    const data = await response.json()
    
    if (data && data.access) {
      return {
        ...token,
        accessToken: data.access,
        accessTokenExpires: Date.now() + 30 * 60 * 1000, // 30 minutes
      }
    }
    
    throw new Error("Failed to refresh token")
  } catch (error) {
    console.error("RefreshAccessTokenError", error)
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
    async jwt({ token, user, account }) {
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
      
      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }
      
      // Access token has expired, try to update it
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      if (token) {
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