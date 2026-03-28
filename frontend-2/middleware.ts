import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth check for public routes
  if (
    pathname === "/" ||
    pathname.startsWith("/marketplace") ||
    pathname.startsWith("/practitioners") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/sessions") ||
    pathname.startsWith("/workshops") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/streams") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/mission") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/careers") ||
    pathname.startsWith("/blog") ||
    pathname.startsWith("/modalities") ||
    pathname.startsWith("/become-practitioner") ||
    pathname.startsWith("/for") ||
    pathname.startsWith("/waitlist") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/accessibility") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")  // Static files
  ) {
    return NextResponse.next()
  }

  // Check for valid session on protected routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    // Redirect to home with a return URL
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.searchParams.set("callbackUrl", pathname)
    if (pathname.startsWith("/dashboard")) {
      url.searchParams.set("session", "expired")
    }
    return NextResponse.redirect(url)
  }

  // Check practitioner role for practitioner dashboard
  if (pathname.startsWith("/dashboard/practitioner")) {
    const user = token?.user as any
    if (!user?.practitionerId && !user?.practitioner_id && !user?.is_practitioner) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard/user"
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except static files and API
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
