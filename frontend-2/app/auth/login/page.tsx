import LoginForm from "@/components/auth/login-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-warm-50 to-white">
      <div className="w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h1 className="text-3xl font-medium text-center mb-2">
            Welcome Back
          </h1>

          <p className="text-center text-gray-600 mb-8">
            Sign in to your Estuary account
          </p>

          <LoginForm />

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
