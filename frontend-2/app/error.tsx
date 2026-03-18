"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="font-serif text-2xl font-medium text-olive-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-olive-500 text-[15px] mb-8">
          We hit an unexpected error. This has been logged and we'll look into it.
          If this persists, contact <a href="mailto:support@estuary.com" className="underline">support@estuary.com</a>.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={reset}
            variant="outline"
            className="rounded-full border-sage-200 text-olive-600"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            asChild
            className="rounded-full bg-sage-600 hover:bg-sage-700 text-white"
          >
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
