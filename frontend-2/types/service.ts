export interface ServiceType {
  id: number
  name: string
  description: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  parent: string | null
  icon: string | null
  image_url: string | null
  is_active: boolean
}

export interface PractitionerBase {
  id: string
  display_name: string
  title: string
  is_verified: boolean
  average_rating: string
  profile_image_url: string
}

export interface Practitioner extends PractitionerBase {
  is_primary: boolean
  role: string
}

export interface Benefit {
  id: number
  title: string
  description: string | null
  icon: string
  order: number
}

export interface AgendaItem {
  id: number
  title: string
  description: string | null
  order: number
}

export interface Language {
  id: string
  name: string
  code: string
}

// Update the Session interface to allow for string service IDs
export interface Session {
  id: number
  slug?: string
  service: number | string
  title: string | null
  description: string | null
  start_time: string
  end_time: string
  max_participants: number
  current_participants: number
  available_spots: number
  sequence_number: number | null
  price: string
  status: string
  created_at: string
  updated_at: string
  agenda: string | null
  what_youll_learn: string | null
  benefits: Benefit[]
  agenda_items: AgendaItem[]
  location: string | null
}

// Update the Service interface to allow for string IDs
export interface Service {
  id: number | string
  slug?: string
  name: string
  description: string
  price: string
  duration: number
  service_type: ServiceType
  service_type_code: string
  service_type_display: string
  category: Category
  is_active: boolean
  is_featured: boolean
  max_participants: number
  min_participants: number
  location_type: string
  tags: string[]
  image_url: string
  average_rating: string | null
  total_reviews: number
  total_bookings: number
  primary_practitioner: PractitionerBase
  practitioners: Practitioner[]
  sessions: Session[]
  child_relationships: any[]
  is_course: boolean
  is_package: boolean
  total_package_price: string | null
  agenda_items: AgendaItem[]
  benefits: Benefit[]
  location: string | null
  experience_level: string
  languages: Language[]
  what_youll_learn: string
  waitlist_count: number
  parent_category_details: any | null
  bookings?: number
}
