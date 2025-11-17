import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Nature-inspired icon/illustration */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Decorative circle background */}
            <div className="absolute inset-0 bg-sage-100/50 rounded-full blur-3xl scale-150" />

            {/* Path/compass icon */}
            <div className="relative bg-white rounded-full p-8 shadow-lg">
              <svg
                className="w-24 h-24 text-sage-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Main message */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-olive-900 tracking-tight">
            You&apos;ve wandered off the path
          </h1>
          <p className="text-xl text-olive-700/80 font-light">
            Here&apos;s your way back to center.
          </p>
        </div>

        {/* Call to action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button asChild size="lg" variant="default">
            <Link href="/">Return Home</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/marketplace">Explore Marketplace</Link>
          </Button>
        </div>

        {/* Additional helpful links */}
        <div className="pt-8 text-sm text-olive-600">
          <p className="mb-3">Looking for something specific?</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/practitioners"
              className="hover:text-sage-700 underline-offset-4 hover:underline transition-colors"
            >
              Browse Practitioners
            </Link>
            <span className="text-olive-300">•</span>
            <Link
              href="/sessions"
              className="hover:text-sage-700 underline-offset-4 hover:underline transition-colors"
            >
              Book a Session
            </Link>
            <span className="text-olive-300">•</span>
            <Link
              href="/help"
              className="hover:text-sage-700 underline-offset-4 hover:underline transition-colors"
            >
              Get Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
