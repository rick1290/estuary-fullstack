/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@livekit/components-react', '@livekit/components-core'],
  images: {
    remotePatterns: [
      // Local development
      { protocol: 'http', hostname: 'localhost' },
      // Unsplash (modality/category images)
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Placeholder avatars
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      // Cloudflare R2 storage (media uploads)
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      // Backend API-served images (production)
      { protocol: 'https', hostname: '*.onrender.com' },
    ],
  },
  async rewrites() {
    return [
      {
        // Exclude NextAuth routes from being proxied
        source: '/api/:path((?!auth).*)',
        destination: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*` : 'http://localhost:8000/api/:path*',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

export default nextConfig
