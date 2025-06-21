# Practitioner Dashboard Pages Analysis

## Overview
This document provides a comprehensive analysis of all pages in the practitioner dashboard located at `/frontend-2/app/dashboard/practitioner/`. It identifies which pages are using mock data vs real API data.

## Page Directory Structure

```
/dashboard/practitioner/
├── page.tsx (Dashboard Home)
├── analytics/
│   └── page.tsx
├── availability/
│   └── page.tsx
├── bookings/
│   └── [id]/
│       └── page.tsx
├── clients/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx
├── finances/
│   ├── earnings/
│   │   └── page.tsx
│   ├── overview/
│   │   └── page.tsx
│   ├── payouts/
│   │   └── page.tsx
│   └── transactions/
│       └── page.tsx
├── messages/
│   └── page.tsx
├── profile/
│   └── page.tsx
├── schedule/
│   ├── page.tsx
│   └── [id]/
│       └── page.tsx
├── services/
│   ├── page.tsx
│   ├── create/
│   │   └── page.tsx
│   ├── edit/
│   │   └── [id]/
│   │       └── page.tsx
│   └── new/
│       └── page.tsx
├── settings/
│   └── page.tsx
└── streams/
    └── page.tsx
```

## Page Analysis by Data Source

### Pages Using REAL API Data ✅

1. **Services Management** (`/services/page.tsx`)
   - Component: `PractitionerServicesManager`
   - API: Uses React Query with `servicesListOptions`, `servicesPartialUpdateMutation`, `servicesDestroyMutation`
   - Data: Fetches real services from backend API
   - Features: Full CRUD operations, filtering, sorting

2. **Availability Management** (`/availability/page.tsx`)
   - Component: Direct implementation in page
   - API: Uses React Query with multiple schedule mutations
   - Data: Real schedule data from backend
   - Features: Create, update, delete schedules, set default, manage time slots

3. **Schedule List View** (`/schedule/page.tsx`)
   - Component: `PractitionerScheduleList`
   - API: Uses `bookingsListOptions` from React Query
   - Data: Real bookings data from backend (though currently showing fallback to mock data)
   - Features: List view of bookings with filtering

### Pages Using MOCK Data ❌

1. **Dashboard Home** (`/page.tsx`)
   - Components: 
     - `PractitionerStats` - Mock statistics data
     - `PractitionerUpcomingBookings` - Mock bookings array
     - `PractitionerMessages` - Mock messages (assumed)
     - `PractitionerEarnings` - Mock earnings (assumed)

2. **Clients Management** (`/clients/page.tsx`)
   - Component: `ClientsList`
   - Data: Uses `mockClients` array with hardcoded data
   - Features: Search, filter, sort - all working on mock data

3. **Profile Management** (`/profile/page.tsx`)
   - Component: `PractitionerProfileForm`
   - Data: Mock function `getPractitionerData()` returns hardcoded profile
   - Features: Form submission simulated with setTimeout

4. **Financial Overview** (`/finances/overview/page.tsx`)
   - Component: Direct implementation
   - Data: All financial data is hardcoded (earnings, balance, growth, etc.)
   - Features: Static display only

### Pages Not Yet Analyzed

These pages need further investigation:
- Analytics (`/analytics/page.tsx`)
- Bookings Detail (`/bookings/[id]/page.tsx`)
- Client Detail (`/clients/[id]/page.tsx`)
- Earnings (`/finances/earnings/page.tsx`)
- Payouts (`/finances/payouts/page.tsx`)
- Transactions (`/finances/transactions/page.tsx`)
- Messages (`/messages/page.tsx`)
- Settings (`/settings/page.tsx`)
- Streams (`/streams/page.tsx`)
- Service Create/Edit pages

## Summary

### Currently Using Real API:
- Services Management (full CRUD)
- Availability Management (schedules)
- Schedule/Bookings List (partial - has API integration but may fallback to mock)

### Need API Integration:
1. **High Priority** (Core functionality):
   - Dashboard stats and widgets
   - Profile management
   - Clients list and details
   - Financial overview and transactions

2. **Medium Priority**:
   - Analytics
   - Messages
   - Payouts management

3. **Lower Priority**:
   - Settings
   - Streams

## Recommendations

1. **Start with Dashboard Home** - Convert mock data in stats, upcoming bookings, and earnings widgets to use real API data

2. **Profile Management** - Replace mock `getPractitionerData()` with real API call to fetch practitioner profile

3. **Clients Management** - Replace `mockClients` array with API integration for client list

4. **Financial Pages** - Implement real financial data APIs for overview, transactions, earnings, and payouts

5. **Standardize Data Fetching** - Use consistent React Query patterns as seen in Services and Availability pages