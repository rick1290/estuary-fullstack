# NextAuth.js Migration Guide

This guide explains how to migrate from the custom auth implementation to NextAuth.js while maintaining compatibility with the Django DRF backend.

## Overview

The migration integrates NextAuth.js with your existing Django REST Framework authentication endpoints, providing:
- Automatic token refresh handling
- Session management
- Support for Google OAuth (with backend integration)
- Improved security with server-side session handling

## Setup Steps

### 1. Environment Variables

Add these to your `.env.local` file:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here # Generate with: openssl rand -base64 32

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Update the Root Layout

In `app/layout.tsx`, wrap your app with the NextAuth provider:

```tsx
import { NextAuthProvider } from "@/components/auth/nextauth-provider"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <NextAuthProvider>
          {/* Your existing providers */}
          {children}
        </NextAuthProvider>
      </body>
    </html>
  )
}
```

### 3. Update HeyAPI Configuration

In `openapi-ts.config.ts`, update the runtime config path:

```ts
export default {
  input: 'http://localhost:8000/api/v1/schema/',
  output: 'src/client',
  plugins: [
    {
      name: '@hey-api/client-next',
      runtimeConfigPath: './src/hey-api-nextauth.ts', // Updated path
    },
    '@tanstack/react-query',
    'zod', 
    {
      dates: true, 
      name: '@hey-api/transformers',
    }
  ],
};
```

### 4. Update Auth Modal Component

Replace the auth service calls in your auth modal with NextAuth:

```tsx
import { useAuth } from "@/hooks/useAuthNextAuth"

// In your component
const { login, isLoading, error } = useAuth()

const handleSubmit = async (data: LoginFormData) => {
  try {
    await login({
      email: data.email,
      password: data.password
    })
    onClose()
    router.push(redirectUrl || "/dashboard")
  } catch (err) {
    // Error is already set in the hook
  }
}
```

### 5. Update Protected Routes

Use the NextAuth session check:

```tsx
import { useAuth } from "@/hooks/useAuthNextAuth"

export default function ProtectedPage() {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return <div>Loading...</div>
  }
  
  if (!isAuthenticated) {
    // Redirect to login or show auth modal
    return null
  }
  
  return <YourComponent />
}
```

### 6. Server-Side Auth Check

For server components, use NextAuth's server-side utilities:

```tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export default async function ServerProtectedPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/signin")
  }
  
  return <YourComponent />
}
```

## Google OAuth Integration

To enable Google OAuth, you'll need to:

1. Set up OAuth credentials in Google Cloud Console
2. Add the environment variables (see above)
3. Create a Django endpoint to handle Google OAuth tokens:

```python
# In your Django backend
@api_view(['POST'])
def google_auth(request):
    google_token = request.data.get('token')
    # Verify Google token
    # Create or update user
    # Return Django JWT tokens
    return Response({
        'access_token': access,
        'refresh_token': refresh,
        'user': user_data
    })
```

4. Update the NextAuth Google provider callback to call your Django endpoint

## Benefits

1. **Automatic Token Refresh**: NextAuth handles token refresh automatically
2. **Session Management**: Server-side sessions improve security
3. **Provider Flexibility**: Easy to add more OAuth providers
4. **Type Safety**: Full TypeScript support with your existing types
5. **Better UX**: No more manual re-login after token expiration

## Rollback Plan

If you need to rollback:

1. Change `openapi-ts.config.ts` back to use `./src/hey-api.ts`
2. Replace `useAuthNextAuth` imports with the original `useAuth`
3. Remove NextAuthProvider from layout
4. Delete the `/app/api/auth` directory

## Testing

1. Test login/logout flow
2. Verify token refresh works (wait 30+ minutes)
3. Check protected routes redirect properly
4. Ensure API calls include auth headers
5. Test error handling for invalid credentials