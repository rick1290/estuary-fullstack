import type { Practitioner } from "@/types/practitioner"

// Mock function to get a practitioner by ID
export async function getPractitionerById(id: string): Promise<Practitioner | null> {
  // In a real app, this would fetch from an API
  // For demo purposes, we're returning mock data
  return {
    id: "6c7d9d49-cef9-4109-8151-ffb7d76bba6f",
    user: {
      id: "6225fef0-88e7-4347-9e2c-b0ef145a5568",
      first_name: "",
      last_name: "",
      email: "richard.j.nielsen@gmail.com",
      profile_picture: null,
    },
    title: "Purchasing manager",
    bio: "Any you fund approach more join. Tell short deep beat story give unit.",
    description:
      "Sell attack daughter continue performance yes friend. Behind moment make something religious item land. Budget girl forward discussion hospital.",
    quote: "Among guess also.",
    profile_image_url: "/practitioner-profile.jpg",
    profile_video_url: null,
    average_rating: "3.00",
    average_rating_float: 3,
    total_reviews: 14,
    years_of_experience: 3,
    is_verified: true,
    featured: false,
    practitioner_status: "active",
    specializations: [
      {
        id: 1,
        content: "Meditation Coach",
      },
      {
        id: 3,
        content: "Nutritionist",
      },
    ],
    styles: [
      {
        id: 1,
        content: "Gentle",
      },
      {
        id: 4,
        content: "Focused",
      },
    ],
    topics: [
      {
        id: 1,
        content: "Wellness",
      },
      {
        id: 2,
        content: "Mental Health",
      },
      {
        id: 3,
        content: "Fitness",
      },
    ],
    modalities: [
      {
        id: "45a2f956-aeab-4037-9eb2-6968956e148d",
        name: "Chat",
        description: "Chat sessions",
      },
      {
        id: "2b6f8169-f277-4c4c-b413-ce93693ac8b8",
        name: "In-Person",
        description: "In-Person sessions",
      },
      {
        id: "ac3dabe5-d903-471f-aa5e-76988199870c",
        name: "Virtual",
        description: "Virtual sessions",
      },
    ],
    certifications: [
      {
        id: "3563b688-4d4e-41f2-be33-0ab1067aff99",
        certificate: "Certified Personal Trainer",
        institution: "National Academy of Sports Medicine",
        order: 2,
      },
      {
        id: "d7480e8b-1e5e-4a4f-b896-f8d64f8be980",
        certificate: "Life Coach Certification",
        institution: "International Coaching Federation",
        order: 5,
      },
    ],
    educations: [
      {
        id: "e8f045be-d8d5-40cb-b6cb-8d0c51e279ed",
        degree: "Doctorate in Physical Therapy",
        educational_institute: "University of California",
        order: 3,
      },
    ],
    questions: [],
    buffer_time: 21,
    next_available_date: null,
    completed_sessions: 45,
    cancellation_rate: "0.97",
    book_times: 173,
    min_price: "54.82",
    max_price: "186.64",
    total_services: 9,
    display_name: "Dr. Robert Brewer",
    services: [
      {
        id: 3,
        name: "Balanced zero administration capacity",
        price: null,
        duration: 30,
        location_type: "virtual",
        is_active: true,
        image_url: "/course-image-1.jpg",
        description:
          "American good after executive figure before difference. Interview ground north accept possible return expert. Opportunity hour like none whole particular. Lawyer child expect store chair. Bank word national PM per next around. Group turn leg leave marriage nation professor.",
        average_rating: null,
        total_reviews: 0,
        upcoming_sessions: [],
        service_type: {
          id: 4,
          name: "course",
          description: "Multi-session educational course",
          code: null,
        },
      },
      {
        id: 15,
        name: "Implemented disintermediate infrastructure",
        price: null,
        duration: 90,
        location_type: "virtual",
        is_active: true,
        image_url: "/workshop-image-1.jpg",
        description: "Media cultural easy. Very job industry why indicate allow. Husband plan produce key.",
        average_rating: null,
        total_reviews: 0,
        upcoming_sessions: [],
        service_type: {
          id: 2,
          name: "workshop",
          description: "Group workshop led by a practitioner",
          code: null,
        },
      },
    ],
    locations: [
      {
        id: 8,
        practitioner: "6c7d9d49-cef9-4109-8151-ffb7d76bba6f",
        name: null,
        address_line1: "3593 Julie Hills",
        address_line2: "",
        city: 3221,
        city_name: "Marshall",
        state: 25,
        state_name: "Missouri",
        state_abbreviation: "MO",
        zip_code: "58227",
        latitude: "39.114700",
        longitude: "-93.201000",
        is_primary: true,
        is_virtual: true,
        is_in_person: false,
        created_at: "2025-04-08T19:25:37.349097Z",
        updated_at: "2025-04-08T19:25:37.349111Z",
      },
      {
        id: 3,
        practitioner: "6c7d9d49-cef9-4109-8151-ffb7d76bba6f",
        name: null,
        address_line1: "2052 Megan View",
        address_line2: "Apt. 450",
        city: 7110,
        city_name: "Kirtland AFB",
        state: 31,
        state_name: "New Mexico",
        state_abbreviation: "NM",
        zip_code: "50792",
        latitude: "35.049700",
        longitude: "-106.559900",
        is_primary: false,
        is_virtual: true,
        is_in_person: true,
        created_at: "2025-04-08T18:31:43.208512Z",
        updated_at: "2025-04-08T18:31:43.208527Z",
      },
    ],
  }
}

// Mock function to get all practitioners with filtering
interface PractitionerFilters {
  query?: string
  location?: string
  modality?: string
  language?: string
  specialties?: string[]
  minRating?: number
  experienceLevel?: string
}

export async function getAllPractitioners(filters: PractitionerFilters = {}): Promise<Practitioner[]> {
  // In a real app, this would fetch from an API with the filters applied
  // For demo purposes, we're returning mock data

  // Generate 10 practitioners with variations
  const practitioners: Practitioner[] = Array.from({ length: 10 }, (_, i) => {
    const isVerified = i % 3 === 0
    const rating = 3 + (i % 3)
    const experience = 1 + (i % 10)

    return {
      id: `practitioner-${i + 1}`,
      user: {
        id: `user-${i + 1}`,
        first_name: "",
        last_name: "",
        email: `practitioner${i + 1}@example.com`,
        profile_picture: null,
      },
      title: ["Wellness Coach", "Yoga Instructor", "Nutritional Therapist", "Life Coach", "Meditation Guide"][i % 5],
      bio: "Professional bio text here.",
      description: "Detailed description of practitioner services and approach.",
      quote: "Inspirational quote.",
      profile_image_url: `https://i.pravatar.cc/200?img=${[47, 33, 44, 12, 32, 52, 48, 68, 91, 15][i]}`,
      profile_video_url: null,
      average_rating: rating.toString(),
      average_rating_float: rating,
      total_reviews: 5 + i * 3,
      years_of_experience: experience,
      is_verified: isVerified,
      featured: i < 3,
      practitioner_status: "active",
      specializations: [
        {
          id: i * 2 + 1,
          content: ["Meditation", "Yoga", "Nutrition", "Life Coaching", "Fitness"][i % 5],
        },
        {
          id: i * 2 + 2,
          content: ["Stress Management", "Mindfulness", "Weight Loss", "Career Development", "Mental Health"][i % 5],
        },
      ],
      styles: [
        {
          id: i + 1,
          content: ["Gentle", "Energetic", "Analytical", "Intuitive", "Structured"][i % 5],
        },
      ],
      topics: [
        {
          id: i + 1,
          content: ["Wellness", "Mental Health", "Fitness", "Career", "Relationships"][i % 5],
        },
      ],
      modalities: [
        {
          id: `modality-${i * 2 + 1}`,
          name: i % 2 === 0 ? "Virtual" : "In-Person",
          description: `${i % 2 === 0 ? "Virtual" : "In-Person"} sessions`,
        },
        {
          id: `modality-${i * 2 + 2}`,
          name: "Chat",
          description: "Chat sessions",
        },
      ],
      certifications: [
        {
          id: `cert-${i + 1}`,
          certificate: [
            "Certified Coach",
            "Registered Yoga Teacher",
            "Nutritionist Certification",
            "Life Coach Certification",
            "Meditation Teacher",
          ][i % 5],
          institution: "Relevant Institution",
          order: 1,
        },
      ],
      educations: [
        {
          id: `edu-${i + 1}`,
          degree: [
            "Bachelor's in Psychology",
            "Master's in Nutrition",
            "Doctorate in Physical Therapy",
            "Wellness Certification",
            "Coaching Diploma",
          ][i % 5],
          educational_institute: "University Name",
          order: 1,
        },
      ],
      questions: [],
      buffer_time: 15,
      next_available_date: null,
      completed_sessions: 10 + i * 5,
      cancellation_rate: "0.05",
      book_times: 15 + i * 10,
      min_price: (50 + i * 5).toString(),
      max_price: (100 + i * 10).toString(),
      total_services: 3 + i,
      display_name: `Dr. ${["Sarah Johnson", "Michael Chen", "Aisha Patel", "James Wilson", "Emma Rodriguez", "David Kim", "Lisa Wang", "Robert Taylor", "Maria Garcia", "John Smith"][i]}`,
      services: [
        {
          id: i * 3 + 1,
          name: `Service ${i * 3 + 1}`,
          price: (75 + i * 5).toString(),
          duration: 60,
          location_type: i % 2 === 0 ? "virtual" : "in_person",
          is_active: true,
          image_url: `/placeholder.svg?height=200&width=300&query=service${i * 3 + 1}`,
          description: "Service description here.",
          average_rating: null,
          total_reviews: 0,
          upcoming_sessions: [],
          service_type: {
            id: 1,
            name: "session",
            description: "One-on-one session",
            code: null,
          },
        },
      ],
      locations: [
        {
          id: i + 1,
          practitioner: `practitioner-${i + 1}`,
          name: null,
          address_line1: "123 Main St",
          address_line2: "",
          city: i + 100,
          city_name: [
            "New York",
            "Los Angeles",
            "Chicago",
            "Houston",
            "Phoenix",
            "Philadelphia",
            "San Antonio",
            "San Diego",
            "Dallas",
            "San Jose",
          ][i],
          state: i + 1,
          state_name: [
            "New York",
            "California",
            "Illinois",
            "Texas",
            "Arizona",
            "Pennsylvania",
            "Texas",
            "California",
            "Texas",
            "California",
          ][i],
          state_abbreviation: ["NY", "CA", "IL", "TX", "AZ", "PA", "TX", "CA", "TX", "CA"][i],
          zip_code: `1000${i}`,
          latitude: "40.7128",
          longitude: "-74.0060",
          is_primary: true,
          is_virtual: i % 2 === 0,
          is_in_person: i % 2 === 1,
          created_at: "2025-04-08T19:25:37.349097Z",
          updated_at: "2025-04-08T19:25:37.349111Z",
        },
      ],
    }
  })

  // Apply filters
  return practitioners.filter((practitioner) => {
    // Filter by search query
    if (filters.query) {
      const query = filters.query.toLowerCase()
      const matchesName = practitioner.display_name.toLowerCase().includes(query)
      const matchesTitle = practitioner.title.toLowerCase().includes(query)
      const matchesSpecialty = practitioner.specializations.some((s) => s.content.toLowerCase().includes(query))

      if (!matchesName && !matchesTitle && !matchesSpecialty) {
        return false
      }
    }

    // Filter by location
    if (filters.location) {
      if (filters.location === "Virtual" && !practitioner.locations.some((l) => l.is_virtual)) {
        return false
      }
      if (filters.location === "In-Person" && !practitioner.locations.some((l) => l.is_in_person)) {
        return false
      }
      if (
        filters.location === "Both" &&
        !(practitioner.locations.some((l) => l.is_virtual) && practitioner.locations.some((l) => l.is_in_person))
      ) {
        return false
      }
    }

    // Filter by modality
    if (filters.modality && !practitioner.modalities.some((m) => m.name === filters.modality)) {
      return false
    }

    // Filter by specialties
    if (filters.specialties && filters.specialties.length > 0) {
      const hasMatchingSpecialty = filters.specialties.some((specialty) =>
        practitioner.specializations.some((s) => s.content === specialty),
      )

      if (!hasMatchingSpecialty) {
        return false
      }
    }

    // Filter by minimum rating
    if (filters.minRating && practitioner.average_rating_float < filters.minRating) {
      return false
    }

    // Filter by experience level
    if (filters.experienceLevel) {
      let meetsExperience = false

      switch (filters.experienceLevel) {
        case "Beginner":
          meetsExperience = practitioner.years_of_experience <= 2
          break
        case "Intermediate":
          meetsExperience = practitioner.years_of_experience > 2 && practitioner.years_of_experience <= 5
          break
        case "Advanced":
          meetsExperience = practitioner.years_of_experience > 5 && practitioner.years_of_experience <= 10
          break
        case "Expert":
          meetsExperience = practitioner.years_of_experience > 10
          break
      }

      if (!meetsExperience) {
        return false
      }
    }

    return true
  })
}
