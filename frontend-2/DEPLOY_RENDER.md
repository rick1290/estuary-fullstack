# Deploying Estuary Frontend to Render with NextAuth

This guide covers deploying the Next.js frontend with NextAuth.js authentication to Render.com, including proper configuration for production environments.

## Prerequisites

- Render account
- Django backend already deployed (assumed to be at `https://your-backend.onrender.com`)
- Domain name (optional but recommended)

## Environment Configuration

### Development vs Production URLs

In development, we use different URLs for client-side vs server-side:
- **Client-side (browser)**: `http://localhost:8000`
- **Server-side (Docker)**: `http://admin:8000`

In production, both use the same public URL:
- **Both**: `https://your-backend.onrender.com`

## Step 1: Prepare Your Repository

### Update `src/hey-api-nextauth.ts`

```typescript
export const createClientConfig: CreateClientConfig = (config) => {
  // In production, use the same URL for both client and server
  const isProd = process.env.NODE_ENV === 'production';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  const baseConfig = {
    ...config,
    baseUrl: isProd 
      ? apiUrl  // Production: use the same URL everywhere
      : (typeof window !== 'undefined' 
          ? 'http://localhost:8000'  // Dev client-side: use localhost
          : apiUrl), // Dev server-side: use Docker service name or env var
  };
  
  // ... rest of the configuration
};
```

## Step 2: Create Render Web Service

1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

### Basic Settings
- **Name**: `estuary-frontend`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your production branch)
- **Root Directory**: `frontend-2`
- **Runtime**: `Node`

### Build & Deploy Settings
- **Build Command**: 
  ```bash
  npm install -g pnpm && pnpm install && pnpm run build
  ```
- **Start Command**: 
  ```bash
  pnpm run start
  ```

## Step 3: Environment Variables

Add these environment variables in Render:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-frontend.onrender.com

# NextAuth Configuration
NEXTAUTH_URL=https://your-frontend.onrender.com
NEXTAUTH_SECRET=your-production-secret-here  # Generate with: openssl rand -base64 32

# For internal API calls (optional, same as NEXT_PUBLIC_API_URL in production)
NEXTAUTH_URL_INTERNAL=https://your-backend.onrender.com

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Node environment
NODE_ENV=production
```

### Generating NEXTAUTH_SECRET
```bash
# Run this locally to generate a secure secret
openssl rand -base64 32
```

## Step 4: Update Django Backend

### Add Frontend URL to ALLOWED_HOSTS

In your Django `settings.py`:

```python
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'your-backend.onrender.com',
    '.onrender.com',  # Allow all Render subdomains
]
```

### Update CORS Settings

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://your-frontend.onrender.com",
]

# Or for more flexibility:
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.onrender\.com$",
]
```

### Configure for HTTPS

```python
# Force HTTPS in production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

## Step 5: NextAuth Production Configuration

### Update `app/api/auth/[...nextauth]/route.ts`

```typescript
const getApiUrl = () => {
  // In production, always use the public API URL
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://your-backend.onrender.com';
  }
  
  // Development logic remains the same
  if (process.env.NEXTAUTH_URL_INTERNAL) {
    return process.env.NEXTAUTH_URL_INTERNAL;
  }
  if (process.env.NEXT_PUBLIC_API_URL === 'http://admin:8000') {
    return 'http://admin:8000';
  }
  return 'http://localhost:8000';
}
```

### Configure Cookies for Production

Add to your NextAuth options:

```typescript
export const authOptions: NextAuthOptions = {
  // ... other options
  
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}
```

## Step 6: Google OAuth Setup (Optional)

If using Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select your project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-frontend.onrender.com/api/auth/callback/google`
   - `http://localhost:3001/api/auth/callback/google` (for development)

## Step 7: Deploy

1. Push your changes to GitHub
2. Render will automatically deploy
3. Wait for the build to complete
4. Test the deployment

## Step 8: Post-Deployment Checklist

- [ ] Test login/logout functionality
- [ ] Verify API calls work correctly
- [ ] Check that JWT tokens are being refreshed
- [ ] Test protected routes redirect properly
- [ ] Verify HTTPS is working
- [ ] Check browser console for any errors
- [ ] Test on multiple devices/browsers

## Troubleshooting

### Common Issues

1. **"Invalid Host Header" error**
   - Add your Render URL to Django's `ALLOWED_HOSTS`

2. **CORS errors**
   - Update `CORS_ALLOWED_ORIGINS` in Django settings
   - Ensure your frontend URL includes the protocol (https://)

3. **NextAuth callback errors**
   - Verify `NEXTAUTH_URL` matches your deployed URL exactly
   - Check that `NEXTAUTH_SECRET` is set in production

4. **API calls failing**
   - Confirm `NEXT_PUBLIC_API_URL` points to your Django backend
   - Check Django logs for any 4xx/5xx errors
   - Verify authentication headers are being sent

### Debug Mode

For debugging production issues, temporarily add:

```typescript
// In your NextAuth configuration
debug: process.env.NODE_ENV === 'development',

// Or enable in production temporarily
debug: true,
```

### Monitoring

Consider setting up:
- Render's built-in metrics
- Sentry for error tracking
- Application logs monitoring

## Security Considerations

1. **Environment Variables**: Never commit secrets to git
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Restrict to specific origins
4. **Headers**: Set security headers in `next.config.mjs`:

```javascript
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
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ]
}
```

## Scaling Considerations

As your application grows:

1. **CDN**: Use Cloudflare or similar for static assets
2. **Database Pooling**: Configure connection pooling in Django
3. **Redis**: Add Redis for session storage and caching
4. **Auto-scaling**: Upgrade to Render's auto-scaling plans

## Maintenance

Regular maintenance tasks:

1. **Update Dependencies**: Keep NextAuth and other packages updated
2. **Rotate Secrets**: Change `NEXTAUTH_SECRET` periodically
3. **Monitor Logs**: Check for authentication errors or anomalies
4. **Backup**: Ensure database backups are configured

## Cost Optimization

- Use Render's free tier for staging environments
- Consider using a single service for both frontend and backend if traffic is low
- Implement proper caching to reduce API calls

## Support

- [Render Documentation](https://render.com/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Django REST Framework](https://www.django-rest-framework.org)

Remember to test thoroughly in a staging environment before deploying to production!