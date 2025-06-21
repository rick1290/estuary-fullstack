# Simple Render Deployment

Just set these environment variables in Render's dashboard:

## Frontend Environment Variables

```bash
# API URL - Set this to your backend's Render URL
NEXT_PUBLIC_API_URL=https://your-backend-name.onrender.com

# NextAuth - Set these to your frontend's Render URL
NEXTAUTH_URL=https://your-frontend-name.onrender.com
NEXTAUTH_SECRET=generate-a-random-secret-here

# Stripe (if using)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-key
```

## How to Deploy

1. **In Render Dashboard**:
   - Create a new Web Service
   - Connect your GitHub repo
   - Choose "Node" environment (not Docker)
   - Root Directory: `frontend-2`
   - Build Command: `npm install -g pnpm && pnpm install && pnpm run build`
   - Start Command: `pnpm start:production`

2. **Add Environment Variables**:
   - Go to Environment tab
   - Add each variable above
   - Replace URLs with your actual Render service URLs

3. **Deploy**:
   - Click "Create Web Service"
   - Wait for build to complete

## That's it!

The build process will:
1. Install dependencies
2. Run `prebuild` which generates the API client using `NEXT_PUBLIC_API_URL`
3. Build Next.js with all environment variables
4. Start the production server

## Notes

- Your backend must be deployed first to get its URL
- Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`
- All `NEXT_PUBLIC_*` variables are available in the browser
- The build will use the production API URL for OpenAPI generation