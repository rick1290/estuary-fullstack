# Estuary Frontend v2

This is the new frontend for the Estuary marketplace, built with:
- Next.js 15 with App Router
- React 19
- TypeScript
- TanStack Query (React Query)
- Hey API for OpenAPI TypeScript client generation
- Radix UI & shadcn/ui components
- Tailwind CSS

## Setup

### Prerequisites
- Node.js 20+
- The backend API running on http://localhost:8000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Generate the API client:
```bash
npm run generate
```

This will fetch the OpenAPI schema from the backend and generate TypeScript types and API client code.

### Development

#### Option 1: Using the run script
```bash
./run-dev.sh
```

#### Option 2: Using Docker
```bash
docker-compose up frontend-2
```

#### Option 3: Manual
```bash
npm run dev
```

The app will be available at http://localhost:3001

## Hey API Integration

This project uses Hey API to generate a type-safe API client from the backend's OpenAPI schema.

### Configuration
- `hey-api.config.ts` - Hey API configuration
- `src/client/hey-api.ts` - Custom client configuration

### Generated Files
All generated files are in `src/client/`:
- `types.ts` - TypeScript types from OpenAPI schema
- `services/` - API service functions
- `queries/` - React Query hooks

### Usage Example

```typescript
import { useAuthLogin } from '@/client/queries';

function LoginForm() {
  const loginMutation = useAuthLogin({
    onSuccess: (data) => {
      // Handle successful login
      console.log('Logged in:', data);
    },
    onError: (error) => {
      // Handle error
      console.error('Login failed:', error);
    },
  });

  const handleSubmit = (email: string, password: string) => {
    loginMutation.mutate({
      body: { email, password },
    });
  };

  return (
    // Your form JSX
  );
}
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run generate` - Generate API client from OpenAPI schema
- `npm run lint` - Run ESLint

## Project Structure

```
frontend-2/
├── app/                  # Next.js app directory
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── providers.tsx    # React Query provider
├── components/          # Reusable components
├── lib/                 # Utility functions
├── hooks/              # Custom React hooks
├── contexts/           # React contexts
├── src/
│   └── client/         # Generated API client (do not edit)
├── public/             # Static assets
└── types/              # TypeScript type definitions
```

## Notes

- The API client is automatically regenerated before `dev` and `build` commands
- All API types are generated from the backend OpenAPI schema
- The client includes automatic request/response transformation
- Date strings are automatically converted to Date objects
- Authentication tokens are stored in localStorage