"use client"

import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestAuthPage() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">NextAuth Test Page</h1>
      
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
          <CardDescription>Test NextAuth integration with Django DRF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Loading Status:</p>
            <p className="font-mono">{isLoading ? "Loading..." : "Ready"}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground">Authentication Status:</p>
            <p className="font-mono">{isAuthenticated ? "Authenticated" : "Not Authenticated"}</p>
          </div>
          
          {user && (
            <div>
              <p className="text-sm text-muted-foreground">User Data:</p>
              <pre className="bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="flex gap-4">
            {!isAuthenticated ? (
              <Button
                onClick={async () => {
                  try {
                    await login("test@example.com", "password123")
                    alert("Login successful!")
                  } catch (error: any) {
                    alert(`Login failed: ${error.message}`)
                  }
                }}
              >
                Test Login
              </Button>
            ) : (
              <Button onClick={logout} variant="outline">
                Logout
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}