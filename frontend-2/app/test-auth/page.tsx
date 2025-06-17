"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"

export default function TestAuthPage() {
  const { login, logout, user, isAuthenticated } = useAuth()
  const [email, setEmail] = useState("testuser@example.com")
  const [password, setPassword] = useState("test1234")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await login(email, password)
      setSuccess("Login successful!")
    } catch (err: any) {
      setError(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setSuccess("Logout successful!")
    } catch (err: any) {
      setError(err.message || "Logout failed")
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="p-4 bg-gray-100 rounded">
            <p className="text-sm font-medium">Current Status:</p>
            <p>Authenticated: {isAuthenticated ? "Yes" : "No"}</p>
            {user && (
              <>
                <p>User: {user.firstName} {user.lastName}</p>
                <p>Email: {user.email}</p>
                <p>Role: {user.role}</p>
              </>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {!isAuthenticated ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          ) : (
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Logout
            </Button>
          )}

          {/* Debug Info */}
          <div className="mt-4 p-4 bg-gray-50 rounded text-xs">
            <p className="font-medium mb-2">Debug Info:</p>
            <p>API URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</p>
            <p>Access Token: {localStorage.getItem('estuary_access_token')?.substring(0, 20)}...</p>
            <p>Refresh Token: {localStorage.getItem('estuary_refresh_token')?.substring(0, 20)}...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}