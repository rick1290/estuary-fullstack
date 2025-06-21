# NextAuth Production Configuration

This guide explains how to configure NextAuth for production deployment.

## Environment Variables

### Required Variables

```bash
# Backend API URL - Used for all API calls
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# NextAuth URL - The URL of your frontend application
NEXTAUTH_URL=https://your-domain.com

# NextAuth Secret - Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-secure-random-string
```

### Optional Variables

```bash
# Internal API URL - For server-to-server communication
# Use when frontend and backend are in different networks
NEXTAUTH_URL_INTERNAL=http://backend-service:8000

# Google OAuth (if using social login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## How It Works

### API URL Resolution

The NextAuth configuration uses a priority system for determining the backend API URL:

1. **`NEXTAUTH_URL_INTERNAL`** - If set, used for server-side authentication calls
2. **Docker detection** - Automatically uses `http://admin:8000` in Docker environments
3. **`NEXT_PUBLIC_API_URL`** - Used for production deployments
4. **Default** - Falls back to `http://localhost:8000` for local development

### Client-Side API Calls

All client-side API calls use `NEXT_PUBLIC_API_URL` through the generated API client.

## Production Deployment Checklist

### 1. Generate a Secure Secret

```bash
openssl rand -base64 32
```

### 2. Set Environment Variables

On your deployment platform (Render, Vercel, etc.), set:

- `NEXT_PUBLIC_API_URL` - Your Django backend URL
- `NEXTAUTH_URL` - Your frontend URL (without trailing slash)
- `NEXTAUTH_SECRET` - The generated secret

### 3. Configure CORS

Ensure your Django backend allows requests from your frontend domain:

```python
# backend/settings.py
CORS_ALLOWED_ORIGINS = [
    "https://your-domain.com",
    # Add your production URLs
]
```

### 4. HTTPS Configuration

- Both frontend and backend should use HTTPS in production
- Update all URLs to use `https://` protocol

## Common Issues

### JWT Token Refresh

NextAuth automatically refreshes JWT tokens:
- Tokens expire after 30 minutes
- Refresh happens automatically 5 minutes before expiry
- Failed refreshes will redirect to login

### Docker Deployments

If deploying with Docker Compose where frontend and backend are in separate containers:

```yaml
# docker-compose.yml
services:
  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=https://api.your-domain.com
      - NEXTAUTH_URL_INTERNAL=http://backend:8000
  
  backend:
    # Your backend service
```

### Session Management

- Sessions last 7 days by default
- Users stay logged in across browser restarts
- Tokens are securely stored in encrypted JWT cookies

## Testing Production Configuration

1. **Test Authentication Flow**:
   ```bash
   # Set production variables locally
   NEXT_PUBLIC_API_URL=https://api.your-domain.com \
   NEXTAUTH_URL=http://localhost:3000 \
   npm run dev
   ```

2. **Verify Token Refresh**:
   - Login and wait 25+ minutes
   - Make an API call
   - Token should refresh automatically

3. **Check CORS**:
   - Open browser DevTools
   - Look for CORS errors in console
   - Ensure no blocked requests

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Use strong secrets** - At least 32 characters
3. **Enable HTTPS** - Required for secure cookies
4. **Rotate secrets** - Change `NEXTAUTH_SECRET` periodically
5. **Monitor auth errors** - Set up error tracking for failed logins