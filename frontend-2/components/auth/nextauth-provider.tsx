"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { useEffect } from "react"

// Component to handle periodic session refresh
function SessionRefresher() {
  const { data: session, update } = useSession()
  
  useEffect(() => {
    // Check session every minute
    const interval = setInterval(() => {
      if (session?.accessTokenExpires) {
        const tokenExpiresIn = session.accessTokenExpires - Date.now()
        const tenMinutes = 10 * 60 * 1000
        
        // If token expires in less than 10 minutes, refresh it
        if (tokenExpiresIn <= tenMinutes) {
          console.log('Token expiring soon, refreshing proactively...')
          update()
        }
      }
    }, 60 * 1000) // Check every minute
    
    return () => clearInterval(interval)
  }, [session, update])
  
  return null
}

export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Re-fetch session every 4 minutes by default
      refetchInterval={4 * 60}
      // Re-fetch session when window is focused
      refetchOnWindowFocus={true}
    >
      <SessionRefresher />
      {children}
    </SessionProvider>
  )
}