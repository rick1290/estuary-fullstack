"use client"

import { getSession } from "next-auth/react"

class TokenMonitor {
  private intervalId: NodeJS.Timeout | null = null
  private isMonitoring = false

  start() {
    if (this.isMonitoring || typeof window === 'undefined') return
    
    this.isMonitoring = true
    console.log('Starting token monitor...')
    
    // Check immediately
    this.checkTokenExpiration()
    
    // Then check every 30 seconds
    this.intervalId = setInterval(() => {
      this.checkTokenExpiration()
    }, 30 * 1000)
    
    // Also check when the page becomes visible
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isMonitoring = false
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    console.log('Stopped token monitor')
  }
  
  private handleVisibilityChange = () => {
    if (!document.hidden) {
      console.log('Page became visible, checking token...')
      this.checkTokenExpiration()
    }
  }
  
  private async checkTokenExpiration() {
    try {
      const session = await getSession()
      
      if (!session) return
      
      if (session.error === "RefreshAccessTokenError") {
        console.error('Token refresh error detected, user needs to re-authenticate')
        // Emit an event that can be handled by the app
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:refresh-failed'))
        }
        return
      }
      
      if (session.accessTokenExpires) {
        const now = Date.now()
        const expiresIn = session.accessTokenExpires - now
        const fiveMinutes = 5 * 60 * 1000
        const oneMinute = 60 * 1000
        
        if (expiresIn <= 0) {
          console.log('Token has expired, triggering refresh...')
          // Only force refresh if it's been expired for less than a minute
          // to avoid infinite refresh loops
          if (expiresIn > -oneMinute) {
            await getSession() // Let NextAuth handle the refresh
          }
        } else if (expiresIn <= fiveMinutes && expiresIn > oneMinute) {
          // Only refresh if we're between 1-5 minutes from expiry
          // This prevents too frequent refreshes
          console.log(`Token expires in ${Math.round(expiresIn / 1000)} seconds, refreshing proactively...`)
          await getSession() // Let NextAuth handle the refresh
        }
      }
    } catch (error) {
      console.error('Error checking token expiration:', error)
    }
  }
}

// Create a singleton instance
export const tokenMonitor = new TokenMonitor()

// Auto-start when imported in browser
if (typeof window !== 'undefined') {
  tokenMonitor.start()
}