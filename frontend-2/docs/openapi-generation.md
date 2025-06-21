# OpenAPI Client Generation

This project uses [@hey-api/openapi-ts](https://github.com/hey-api/openapi-ts) to generate TypeScript clients from the backend's OpenAPI schema.

## Local Development

During local development, the API client is automatically generated before starting the dev server:

```bash
pnpm dev
# This runs "predev" script which generates the client from http://localhost:8000/api/v1/schema/
```

## Production Builds

The API client is automatically generated before building for production:

```bash
pnpm build
# This runs "prebuild" script which generates the client using NEXT_PUBLIC_API_URL
```

## Manual Generation

You can manually generate the API client:

```bash
# For local development (uses localhost:8000)
pnpm generate

# For production (uses NEXT_PUBLIC_API_URL environment variable)
pnpm generate:prod
```

## Configuration

### Environment Variables

Set `NEXT_PUBLIC_API_URL` in your deployment platform to point to your backend API:

```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### OpenAPI Config

The configuration is in `openapi-ts.config.ts`:

- In development: Uses `http://localhost:8000/api/v1/schema/`
- In production: Uses `${NEXT_PUBLIC_API_URL}/api/v1/schema/`

## Troubleshooting

If the API generation fails during build, the build will continue with a warning. This prevents build failures if the backend is temporarily unavailable.

To debug generation issues:

1. Check that your backend is running and accessible
2. Verify the schema endpoint returns valid OpenAPI JSON
3. Check the console output for specific errors
4. Ensure NEXT_PUBLIC_API_URL is set correctly in production

## CI/CD Considerations

For deployment platforms like Render, Vercel, or Netlify:

1. Set `NEXT_PUBLIC_API_URL` environment variable
2. The build process will automatically generate the client
3. If your backend requires authentication to access the schema, you may need to make the schema endpoint public or use a build-time API key