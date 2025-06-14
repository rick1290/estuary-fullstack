import LoginForm from "@/components/auth/login-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-sage-50 via-cream-100 to-cream-50">
      <div className="w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-sage-200 p-8 relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-sage-50/30 to-terracotta-50/30" />
          <div className="relative z-10">
            <h1 className="text-3xl font-medium text-center mb-2 text-olive-900">
              Welcome Back
            </h1>

            <p className="text-center text-olive-600 mb-8">
              Sign in to your Estuary account
            </p>

            <LoginForm />

            <div className="mt-6 text-center">
              <p className="text-sm text-olive-600">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-sage-700 hover:text-sage-900 hover:underline font-medium transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
