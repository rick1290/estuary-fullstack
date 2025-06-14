export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  profile_picture: string | null
}

export interface Specialization {
  id: number
  content: string
}

export interface Style {
  id: number
  content: string
}

export interface Topic {
  id: number
  content: string
}

export interface Modality {
  id: string
  name: string
  description: string
}

export interface Certification {
  id: string
  certificate: string
  institution: string
  order: number
}

export interface Education {
  id: string
  degree: string
  educational_institute: string
  order: number
}

export interface ServiceType {
  id: number
  name: string
  description: string
  code: string | null
}

export interface Category {
  id: string | null
  name: string | null
  slug?: string
  description?: string
  icon?: string | null
  image_url?: string | null
  parent?: string | null
  is_active?: boolean
}

export interface UpcomingSession {
  id: number
  start_time: string
  end_time: string
  location: string | null
  max_participants: number
  current_participants: number
}

export interface ChildService {
  id: number
  name: string
  price: number | null
  duration: number
  location_type: string
  description: string
  service_type: {
    id: number
    name: string
  }
  category: {
    id: string | null
    name: string | null
  }
  quantity: number
  discount_percentage: number
}

export interface Service {
  id: number
  name: string
  price: string | null
  duration: number
  location_type: string
  is_active: boolean
  image_url: string | null
  description: string
  average_rating: string | null
  total_reviews: number
  upcoming_sessions?: UpcomingSession[]
  service_type: ServiceType
  category?: Category
  child_services?: ChildService[]
}

export interface ServicesByCategory {
  category: Category
  services: Service[]
}

export interface ServicesByType {
  service_type: ServiceType
  services: Service[]
}

export interface ServiceCategory {
  id: string
  name: string
  slug: string
  description: string
  icon: string | null
  image_url: string | null
  is_active: boolean
}

export interface Location {
  id: number
  practitioner: string
  name: string | null
  address_line1: string
  address_line2: string
  city: number
  city_name: string
  state: number
  state_name: string
  state_abbreviation: string
  zip_code: string
  latitude: string
  longitude: string
  is_primary: boolean
  is_virtual: boolean
  is_in_person: boolean
  created_at: string
  updated_at: string
}

export interface Practitioner {
  id: string
  user: User
  title: string
  bio: string
  description: string
  quote: string
  profile_image_url: string
  profile_video_url: string | null
  average_rating: string
  average_rating_float: number
  total_reviews: number
  years_of_experience: number
  is_verified: boolean
  featured: boolean
  practitioner_status: string
  specializations: Specialization[]
  styles: Style[]
  topics: Topic[]
  modalities: Modality[]
  certifications: Certification[]
  educations: Education[]
  questions: any[]
  buffer_time: number
  next_available_date: string | null
  completed_sessions: number
  cancellation_rate: string
  book_times: number
  min_price: string
  max_price: string
  total_services: number
  display_name: string
  services: Service[]
  services_by_category: ServicesByCategory[]
  services_by_type: ServicesByType[]
  service_categories: ServiceCategory[]
  locations: Location[]
}
