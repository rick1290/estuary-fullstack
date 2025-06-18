# Service Management System - Frontend & Backend Integration

## Overview
This document outlines the complete service management system for the Estuary wellness marketplace, detailing the integration between frontend and backend, service type workflows, and implementation guidelines.

## Backend Model Structure

### Core Service Model (67+ Fields)
The Service model is comprehensive and handles all service types through a single model with conditional fields.

#### Essential Fields
```python
# Basic Information
name                    # Service title
description            # Full description
short_description      # Brief summary for listings
price_cents            # Price in cents (e.g., $100.00 = 10000)
duration_minutes       # Duration in minutes
service_type           # ForeignKey to ServiceType

# Categorization
category               # Global category (admin-managed)
practitioner_category  # Practitioner's custom category
tags                   # JSON array for search/filtering

# Participants & Demographics
max_participants       # Maximum participants
min_participants       # Minimum to run
experience_level       # beginner/intermediate/advanced/all_levels
age_min               # Minimum age (optional)
age_max               # Maximum age (optional)

# Location & Delivery
location_type         # virtual/in_person/hybrid
address               # Physical address for in-person
languages             # ManyToMany to Language model

# Status & Visibility
is_active             # Can be booked
is_public             # Publicly visible
is_featured           # Featured in listings
status                # draft/active/inactive/archived

# Content & Learning
what_youll_learn      # Learning outcomes
prerequisites         # Requirements
includes              # What's included (JSON)

# Media
image_url             # Primary service image
video_url             # Promotional video

# Bundle/Package Specific
validity_days         # Days valid after purchase
sessions_included     # Number of sessions (bundles)
bonus_sessions        # Extra sessions included
max_per_customer      # Purchase limit per customer
is_transferable       # Can transfer to others
is_shareable          # Can share with family/friends

# Availability Window
available_from        # When sales start
available_until       # When sales end
highlight_text        # Badge text (e.g., "BEST VALUE")

# Legal & Terms
terms_conditions      # Specific terms for service

# Relationships
primary_practitioner  # Main practitioner (auto-set)
additional_practitioners  # Co-facilitators (M2M through ServicePractitioner)
```

### Related Models

#### ServiceCategory (Global Categories)
- Admin-managed categories for organization
- Featured categories for promotion
- API: `/api/v1/services/categories/`

#### PractitionerServiceCategory (Personal Categories)
- Practitioner-created custom categories
- Color coding and custom icons
- API: `/api/v1/services/practitioner-categories/`
- **Full CRUD available**

#### ServiceType (Service Types)
- session, workshop, course, package, bundle
- Determines workflow and required fields
- **IMMUTABLE AFTER CREATION**

#### ServiceRelationship (Package/Bundle Contents)
- Links parent services to child services
- Quantity, order, discount configuration
- Used for packages and bundles

#### ServiceSession (Scheduled Occurrences)
- For workshops and courses
- Specific date/time slots
- Participant management
- Daily.co integration for virtual rooms

#### ServiceResource (Materials & Files)
- Documents, videos, images, links, audio
- Access level controls (public/registered/enrolled/completed/private)
- API: `/api/v1/services/resources/`

#### ServiceBenefit (Key Benefits)
- Title, description, icon, order
- Highlights what users gain
- **API needs to be created**

#### ServicePractitioner (Revenue Sharing)
- Multi-practitioner services
- Revenue percentage splits
- Role assignments

## Service Type Workflows

### 1. Session (One-on-One)
**Purpose**: Individual appointments
**Workflow**:
1. Basic Info (name, description, price, duration)
2. Demographics (age restrictions, experience level)
3. Location (virtual/in-person with address)
4. Availability (select from practitioner schedules)
5. Media & Resources
6. Benefits & Features
7. Terms & Conditions

**Key Fields**:
- Simple pricing model
- Single participant (max_participants = 1)
- No service sessions needed
- Direct booking to practitioner schedule

### 2. Workshop (Group Event)
**Purpose**: Single group events with specific dates
**Workflow**:
1. Basic Info
2. Group Settings (max participants, age restrictions)
3. Service Sessions (create scheduled sessions with dates/times)
4. Location (per session)
5. Media & Resources
6. Benefits & Agenda
7. Terms & Conditions

**Key Fields**:
- Multiple participants (max_participants > 1)
- One or more ServiceSessions with specific dates
- Location can vary per session
- Group dynamics considerations

### 3. Course (Multi-Session Program)
**Purpose**: Sequential learning journey
**Workflow**:
1. Basic Info
2. Course Structure (max participants, prerequisites)
3. Service Sessions (multiple sessions with curriculum)
4. Learning Outcomes (what_youll_learn)
5. Course Materials (resources)
6. Benefits & Curriculum
7. Terms & Conditions

**Key Fields**:
- Multiple ServiceSessions in sequence
- Strong focus on learning outcomes
- Prerequisites often required
- Comprehensive resource materials

### 4. Package (Service Collection)
**Purpose**: Bundle different services together
**Workflow**:
1. Basic Info
2. Service Selection (choose existing services)
3. Package Configuration (quantities, discounts)
4. Package Terms (validity, transferability)
5. Benefits & Value Proposition
6. Terms & Conditions

**Key Fields**:
- ServiceRelationship for child services
- Complex pricing with discounts
- Validity periods
- Transfer/sharing rules

### 5. Bundle (Session Credits)
**Purpose**: Bulk purchase of same service type
**Workflow**:
1. Basic Info
2. Bundle Configuration (sessions_included, bonus_sessions)
3. Usage Terms (validity_days, max_per_customer)
4. Benefits & Savings
5. Terms & Conditions

**Key Fields**:
- sessions_included (number of sessions)
- bonus_sessions (extra sessions)
- Validity period
- Purchase limitations

## Frontend Wizard Architecture

### Wizard Steps (Dynamic Based on Service Type)

#### Universal Steps (All Service Types)
1. **Service Type Selection** - IMMUTABLE after creation
2. **Basic Information** - Core details
3. **Practitioner Categories** - Custom categorization
4. **Demographics & Targeting** - Age, experience level
5. **Media & Presentation** - Images, videos
6. **Terms & Conditions** - Legal terms
7. **Preview** - Final review

#### Service-Type Specific Steps

**Session Only:**
- **Availability Configuration** - Schedule selection

**Workshop/Course:**
- **Service Sessions** - Date/time scheduling
- **Group Settings** - Participant limits
- **Learning Outcomes** - Benefits and agenda

**Package:**
- **Service Selection** - Choose child services
- **Package Configuration** - Discounts and quantities

**Bundle:**
- **Bundle Configuration** - Session counts and bonuses

### Form State Management

```typescript
interface ServiceFormData {
  // Service Type (IMMUTABLE)
  serviceType: string              // session/workshop/course/package/bundle
  serviceTypeId: number           // Backend ServiceType ID

  // Basic Information
  name: string
  description: string
  short_description: string
  price: string                   // Converted to price_cents
  duration_minutes: number

  // Categorization
  category_id?: number            // Global category
  practitioner_category_id?: number  // Custom category
  tags: string[]

  // Demographics
  max_participants: number
  min_participants: number
  experience_level: string
  age_min?: number
  age_max?: number

  // Location
  location_type: string           // virtual/in_person/hybrid
  address_id?: number            // For in-person services
  languages: string[]

  // Status
  status: string                 // draft/active/inactive/archived
  is_active: boolean
  is_public: boolean
  is_featured: boolean

  // Content
  what_youll_learn: string
  prerequisites: string
  includes: Record<string, any>   // JSON object

  // Media
  image_url: string
  video_url: string

  // Bundle/Package Specific
  validity_days: number
  sessions_included: number
  bonus_sessions: number
  max_per_customer?: number
  is_transferable: boolean
  is_shareable: boolean

  // Availability Window
  available_from?: Date
  available_until?: Date
  highlight_text: string

  // Terms
  terms_conditions: string

  // Related Data
  serviceSessions: ServiceSessionRequest[]     // For workshops/courses
  selectedServices: SelectedService[]          // For packages
  benefits: ServiceBenefit[]                  // Key benefits
  resources: ServiceResource[]                // Materials

  // Practitioners
  additional_practitioner_ids: number[]       // Co-facilitators
}
```

## API Integration

### Service CRUD
```typescript
// Create Service
POST /api/v1/services/
Body: ServiceCreateUpdateRequestWritable

// Update Service (no service type change)
PUT /api/v1/services/{id}/
Body: ServiceCreateUpdateRequestWritable (without serviceType)

// Get Service Details
GET /api/v1/services/{id}/
Response: ServiceDetailReadable

// Delete Service
DELETE /api/v1/services/{id}/
```

### Practitioner Categories
```typescript
// List Categories
GET /api/v1/services/practitioner-categories/
Response: PractitionerServiceCategory[]

// Create Category
POST /api/v1/services/practitioner-categories/
Body: { name, description, color?, icon? }

// Update Category
PUT /api/v1/services/practitioner-categories/{id}/

// Delete Category
DELETE /api/v1/services/practitioner-categories/{id}/

// Reorder Categories
POST /api/v1/services/practitioner-categories/reorder/
Body: { category_ids: number[] }
```

### Service Resources
```typescript
// List Resources
GET /api/v1/services/{id}/resources/

// Add Resource
POST /api/v1/services/resources/
Body: { service_id, title, description, resource_type, file, access_level }

// Update Resource
PUT /api/v1/services/resources/{id}/

// Delete Resource
DELETE /api/v1/services/resources/{id}/
```

## Action Plan Implementation

### Phase 1: Critical Infrastructure
1. **Service Type Immutability**
   - Disable service type selection in edit mode
   - Add clear warnings about immutability
   - Validate on backend

2. **Practitioner Categories**
   - Create category management UI
   - Integrate into service wizard
   - CRUD operations with API

3. **Complete Form Fields**
   - Add all missing Service model fields
   - Update form context and validation
   - Implement conditional field rendering

### Phase 2: Enhanced UX
4. **File Upload System**
   - Replace URL inputs with file upload
   - Image processing and optimization
   - Multi-file support for resources

5. **Service Benefits**
   - Create benefits management UI
   - Icon selection system
   - Drag-and-drop ordering

6. **Service Sessions (Workshops/Courses)**
   - Date/time scheduling interface
   - Calendar integration
   - Session management

### Phase 3: Advanced Features
7. **Package Builder**
   - Service selection interface
   - Pricing calculator
   - Discount configuration

8. **Revenue Sharing**
   - Multi-practitioner selection
   - Percentage allocation
   - Validation rules

9. **Resource Management**
   - File upload with categorization
   - Access level configuration
   - Preview functionality

## Best Practices

### Frontend
1. **Progressive Disclosure**: Show fields relevant to selected service type
2. **Validation**: Real-time validation with clear error messages
3. **Auto-save**: Prevent data loss with automatic saving
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Performance**: Lazy load heavy components
6. **State Management**: Centralized form state with undo/redo

### Backend Integration
1. **Error Handling**: Graceful degradation with meaningful messages
2. **Optimistic Updates**: Update UI immediately, sync with backend
3. **Caching**: Cache frequently accessed data (categories, types)
4. **File Handling**: Secure upload with virus scanning and validation

### Data Validation
1. **Client-side**: Immediate feedback for better UX
2. **Server-side**: Security and data integrity
3. **Cross-field**: Validate field combinations (e.g., age_min < age_max)
4. **Business Rules**: Enforce business logic constraints

## Service Type Constraints

### Immutability Rules
- Service type CANNOT be changed after creation
- Clear UI indicators in edit mode
- Backend validation prevents type changes
- Migration path: duplicate and archive old service

### Type-Specific Validations
- **Session**: max_participants must be 1
- **Workshop/Course**: Requires at least one ServiceSession
- **Package**: Must have child services
- **Bundle**: sessions_included must be > 0

## File Upload Strategy

### Supported File Types
- **Images**: JPG, PNG, WebP (for service images)
- **Videos**: MP4, WebM (for promotional videos)
- **Documents**: PDF, DOC, DOCX (for resources)
- **Audio**: MP3, WAV (for audio resources)

### Upload Flow
1. Client-side validation (type, size)
2. Generate signed upload URL
3. Direct upload to cloud storage
4. Update service with file URLs
5. Background processing (thumbnails, compression)

## Security Considerations

### Access Control
- Only service owner can edit
- Practitioner role required for creation
- Resource access based on enrollment status

### Data Validation
- Sanitize all user inputs
- Validate file uploads
- Rate limiting on API endpoints
- CSRF protection on forms

This comprehensive system provides a professional-grade service management platform with full CRUD capabilities, proper type safety, and excellent user experience.