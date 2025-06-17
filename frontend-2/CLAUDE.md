# Estuary Frontend-2 Documentation

## Overview
Estuary is a wellness marketplace platform that connects practitioners with clients seeking transformation through various wellness services. The platform operates as a two-sided marketplace with sophisticated booking, financial tracking, and content management capabilities.

## Business Model

### Marketplace Structure
- **Two-sided marketplace**: Practitioners offer services, customers book and pay for them
- **Service Types**:
  1. **Sessions**: One-on-one personal wellness sessions with flexible scheduling
  2. **Workshops**: Group experiences with specific dates/times
  3. **Courses**: Structured learning journeys with comprehensive curriculum
  4. **Streams**: Content platform for articles, videos, audio (free and premium)

### Revenue Model
- **Commission-based**: Platform takes 5% standard commission (with volume-based tiers)
- **Credit System**: Customers can have credit balances applied to purchases
- **Payout System**: Practitioners request payouts of their earned balance
- **Premium Content**: Monetization through locked/premium stream content

### User Types
1. **Customers/Users**: Browse, book services, manage appointments, consume content
2. **Practitioners**: Create services, manage availability, track earnings, publish content

## Technical Stack

### Core Technologies
- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript with React 19
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI/shadcn components
- **State Management**: React hooks, Context API
- **Data Fetching**: Tanstack Query
- **Forms**: React Hook Form with Zod validation
- **API Client**: OpenAPI TypeScript generated clients
- **Authentication**: NextAuth.js
- **Package Manager**: pnpm

### Design System
- **Color Palette**:
  - Primary: Sage (#9CAF88)
  - Secondary: Terracotta (#E07A5F)
  - Accent: Olive (#7A6F5D), Blush (#F4A261)
  - Neutral: Cream (#FAF3E0), Warm grays
- **Layout**: Consistent max-w-7xl containers with responsive padding
- **Components**: Comprehensive UI library with consistent theming

## Project Structure

### Key Directories
```
/app                    # Next.js App Router pages
  /dashboard           # User and practitioner dashboards
  /marketplace         # Service browsing pages
  /practitioners       # Practitioner profiles
  /checkout           # Payment flow
  /streams            # Content platform
/components            # Reusable React components
  /auth               # Authentication components
  /dashboard          # Dashboard-specific components
  /marketplace        # Marketplace components
  /practitioners      # Practitioner components
  /services           # Service-related components
  /streams            # Stream content components
  /ui                 # Base UI components
/lib                   # Utilities and helpers
/hooks                 # Custom React hooks
/types                 # TypeScript type definitions
/api-client           # Generated API clients
```

### Important Routes
- `/` - Homepage with hero, featured content
- `/marketplace` - Main marketplace hub
- `/marketplace/[type]` - Filtered by service type
- `/dashboard/user` - Customer dashboard
- `/dashboard/practitioner` - Practitioner portal
- `/practitioners/[id]` - Individual practitioner profiles
- `/services/[id]` - Service detail pages
- `/checkout` - Booking checkout flow
- `/streams` - Content discovery platform

## Key Features

### For Customers
- **Service Discovery**: Browse by type, category, practitioner
- **Flexible Booking**: Different flows for sessions, workshops, courses
- **Credit System**: Apply account credits to purchases
- **Saved Items**: Heart/save practitioners and services
- **Messaging**: Direct communication with practitioners
- **Dashboard**: Manage bookings, profile, messages, streams

### For Practitioners
- **Service Management**: Create/edit multiple service offerings
- **Availability Calendar**: Set working hours and blocked times
- **Financial Dashboard**:
  - Real-time earnings tracking
  - Commission transparency
  - Payout requests
  - Transaction history
- **Analytics**: Client metrics, booking trends, revenue analysis
- **Content Creation**: Publish free/premium stream content
- **Client Management**: Track bookings, communicate with clients

### Authentication & Authorization
- **Unified Auth Modal**: Single modal handles all login/signup flows
- **Role Switching**: Users with practitioner accounts can switch views
- **Protected Routes**: Automatic redirects for unauthenticated users
- **Session Management**: Persistent auth state across the app

## Development Guidelines

### Code Style
- **Components**: Functional components with TypeScript
- **Naming**: PascalCase for components, camelCase for functions/variables
- **File Structure**: Co-locate related components and styles
- **Imports**: Absolute imports using @ alias

### State Management Patterns
- **Local State**: useState for component-specific state
- **Global Auth**: Context API for authentication
- **Server State**: Tanstack Query for API data
- **Form State**: React Hook Form with Zod validation

### Common Patterns
```typescript
// Component with auth check
const { isAuthenticated } = useAuth()
const { openAuthModal } = useAuthModal()

if (!isAuthenticated) {
  openAuthModal({
    defaultTab: "login",
    redirectUrl: currentPath,
    title: "Sign in Required",
    description: "Please sign in to continue"
  })
}

// Consistent layout wrapper
<PractitionerDashboardPageLayout>
  <YourContent />
</PractitionerDashboardPageLayout>

// Service type differentiation
const getBookingFlow = (serviceType: string) => {
  switch(serviceType) {
    case 'session': return <TimeSlotPicker />
    case 'workshop': return <DateSelector />
    case 'course': return <CourseSchedule />
  }
}
```

## API Integration

### Backend Structure
- **Base URL**: Configured via environment variables
- **Authentication**: JWT tokens with refresh mechanism
- **API Client**: Auto-generated from OpenAPI schema
- **Error Handling**: Consistent error response format

### Key Endpoints
- `/api/auth/*` - Authentication flows
- `/api/services/*` - Service CRUD operations
- `/api/bookings/*` - Booking management
- `/api/practitioners/*` - Practitioner profiles
- `/api/streams/*` - Content management
- `/api/transactions/*` - Financial operations

## Deployment

### Environment Variables
```
NEXT_PUBLIC_API_URL=        # Backend API URL
NEXTAUTH_URL=               # App URL for auth
NEXTAUTH_SECRET=            # Auth encryption key
DATABASE_URL=               # Database connection
```

### Build & Deploy
- **Build**: `pnpm build`
- **Start**: `pnpm start`
- **Deploy**: Configured for Render.com via render.yaml

## Important Implementation Notes

### Booking System
- **Sessions**: User selects available time slots
- **Workshops**: Fixed dates/times set by practitioner
- **Courses**: Predefined schedule with multiple sessions
- **Confirmation**: Immediate booking confirmation with email

### Financial Flow
1. Customer makes purchase → Payment processed
2. Credits allocated to practitioner (minus commission)
3. Practitioner balance updated in real-time
4. Payout available after minimum threshold
5. Commission rates adjust based on volume tiers

### Content Streams
- **Types**: Article, Video, Audio, Image
- **Access**: Free public content + premium locked content
- **Monetization**: Practitioners can charge for premium access
- **Discovery**: Category filtering, search, recommendations

## Testing & Development

### Local Development
```bash
pnpm install
pnpm dev
```

### Key Test Scenarios
1. Complete booking flow for each service type
2. Practitioner onboarding and service creation
3. Financial transactions and payout requests
4. Content creation and premium access
5. Role switching between customer/practitioner views

## Future Considerations
- Real-time messaging implementation
- Video consultation integration
- Advanced analytics and reporting
- Mobile app development
- International payment support
- Multi-language support