import type { Service, Session } from "@/types/service"

// Update the getServiceById function to handle string IDs
export async function getServiceById(id: string | number): Promise<Service | null> {
  // In a real app, this would fetch from an API
  // For demo purposes, we're returning mock data

  // Handle specific string IDs for courses, workshops, etc.
  if (id === "c1") {
    return {
      id: "c1",
      name: "Mindfulness Meditation Course",
      description:
        "A comprehensive 8-week course teaching mindfulness meditation techniques for stress reduction and improved mental clarity. Learn how to incorporate mindfulness into your daily life and develop a sustainable meditation practice.",
      price: "299.00",
      duration: 480, // 8 weeks
      service_type: {
        id: 4,
        name: "course",
        description: "Multi-session educational course",
      },
      category: {
        id: "2e44360f-52bf-4ef3-ba43-2063ac3ab5c9",
        name: "Mindfulness",
        slug: "mindfulness",
        description: "Services focused on mindfulness and meditation.",
        parent: null,
        icon: null,
        image_url: null,
        is_active: true,
      },
      is_active: true,
      is_featured: true,
      max_participants: 15,
      min_participants: 5,
      location_type: "online",
      tags: ["mindfulness", "meditation", "stress-relief", "mental-health", "wellness"],
      image_url: "/serene-meditation-space.png",
      average_rating: "4.8",
      total_reviews: 24,
      total_bookings: 120,
      primary_practitioner: {
        id: "61a42db2-9df9-48b5-84bb-98f50eb9b74b",
        display_name: "Dr. Sarah Johnson",
        title: "Mindfulness Coach & Certified Meditation Instructor",
        is_verified: true,
        average_rating: "4.9",
        profile_image_url: "/confident-professional.png",
        bio: "Dr. Sarah Johnson has over 15 years of experience teaching mindfulness and meditation. She holds a Ph.D. in Clinical Psychology and has trained with leading meditation teachers worldwide.",
      },
      practitioners: [
        {
          id: "61a42db2-9df9-48b5-84bb-98f50eb9b74b",
          display_name: "Dr. Sarah Johnson",
          title: "Mindfulness Coach & Certified Meditation Instructor",
          is_verified: true,
          average_rating: "4.9",
          profile_image_url: "/confident-professional.png",
          is_primary: true,
          role: "host",
        },
        {
          id: "22870319-9eba-46f8-a2a3-759d66ce9649",
          display_name: "Michael Chen",
          title: "Meditation Teacher & Wellness Consultant",
          is_verified: true,
          average_rating: "4.7",
          profile_image_url: "/confident-leader.png",
          is_primary: false,
          role: "guest",
        },
      ],
      sessions: [
        {
          id: 101,
          service: "c1",
          title: "Session 1: Introduction to Mindfulness",
          description: "Learn the fundamentals of mindfulness meditation and set intentions for your practice.",
          start_time: "2025-05-01T18:00:00Z",
          end_time: "2025-05-01T19:30:00Z",
          max_participants: 15,
          current_participants: 8,
          available_spots: 7,
          sequence_number: 1,
          price: "0.00", // Included in course price
          status: "scheduled",
          created_at: "2025-04-01T12:00:00Z",
          updated_at: "2025-04-01T12:00:00Z",
          agenda: "Introduction to mindfulness concepts, guided meditation practice, Q&A session",
          what_youll_learn:
            "- Understand the core principles of mindfulness\n- Learn proper meditation posture\n- Practice basic breathing techniques\n- Set personal intentions for your practice",
          benefits: [],
          agenda_items: [],
          location: null,
        },
        {
          id: 102,
          service: "c1",
          title: "Session 2: Mindfulness of the Body",
          description: "Explore body awareness techniques and learn how to use the body as an anchor for attention.",
          start_time: "2025-05-08T18:00:00Z",
          end_time: "2025-05-08T19:30:00Z",
          max_participants: 15,
          current_participants: 8,
          available_spots: 7,
          sequence_number: 2,
          price: "0.00", // Included in course price
          status: "scheduled",
          created_at: "2025-04-01T12:00:00Z",
          updated_at: "2025-04-01T12:00:00Z",
          agenda: "Body scan meditation, mindful movement exercises, discussion of home practice",
          what_youll_learn:
            "- Practice the body scan meditation technique\n- Develop awareness of physical sensations\n- Learn mindful movement exercises\n- Understand the mind-body connection",
          benefits: [],
          agenda_items: [],
          location: null,
        },
        {
          id: 103,
          service: "c1",
          title: "Session 3: Working with Thoughts",
          description:
            "Learn to observe thoughts without attachment and develop a more peaceful relationship with your mind.",
          start_time: "2025-05-15T18:00:00Z",
          end_time: "2025-05-15T19:30:00Z",
          max_participants: 15,
          current_participants: 7,
          available_spots: 8,
          sequence_number: 3,
          price: "0.00", // Included in course price
          status: "scheduled",
          created_at: "2025-04-01T12:00:00Z",
          updated_at: "2025-04-01T12:00:00Z",
          agenda: "Thought observation exercises, guided meditation, group discussion",
          what_youll_learn:
            "- Recognize thought patterns\n- Practice non-judgmental awareness\n- Learn techniques for working with difficult thoughts\n- Develop mental clarity",
          benefits: [],
          agenda_items: [],
          location: null,
        },
      ],
      child_relationships: [],
      is_course: true,
      is_package: false,
      total_package_price: null,
      agenda_items: [],
      benefits: [
        {
          id: 201,
          title: "Reduced Stress & Anxiety",
          description: "Learn techniques to calm your mind and reduce stress in daily life.",
          icon: "heart",
          order: 1,
        },
        {
          id: 202,
          title: "Improved Focus & Concentration",
          description: "Develop skills to enhance attention and mental clarity.",
          icon: "target",
          order: 2,
        },
        {
          id: 203,
          title: "Better Sleep Quality",
          description: "Discover practices that promote restful sleep and relaxation.",
          icon: "moon",
          order: 3,
        },
        {
          id: 204,
          title: "Enhanced Self-Awareness",
          description: "Gain deeper insights into your thoughts, emotions, and behaviors.",
          icon: "eye",
          order: 4,
        },
      ],
      location: null,
      experience_level: "beginner",
      languages: [
        {
          id: "en-us",
          name: "English",
          code: "en",
        },
      ],
      what_youll_learn:
        "- Establish a consistent meditation practice\n- Apply mindfulness techniques to daily activities\n- Manage stress and difficult emotions effectively\n- Improve focus and concentration\n- Develop greater self-awareness and compassion\n- Create a personalized mindfulness toolkit",
      waitlist_count: 3,
      parent_category_details: null,
    }
  }

  // Handle numeric IDs (original implementation)
  const numericId = typeof id === "string" ? Number.parseInt(id, 10) : id

  if (isNaN(numericId)) {
    return null
  }

  return {
    id: 37,
    name: "Configurable responsive installation",
    description:
      "Grow pressure without bank magazine long. Discuss thought per yes body need discussion. Democrat live artist. Evening common option ok center.",
    price: "311.63",
    duration: 120,
    service_type: {
      id: 4,
      name: "course",
      description: "Multi-session educational course",
    },
    category: {
      id: "2e44360f-52bf-4ef3-ba43-2063ac3ab5c9",
      name: "Fitness",
      slug: "fitness",
      description: "Services focused on physical fitness and exercise.",
      parent: null,
      icon: null,
      image_url: null,
      is_active: true,
    },
    is_active: true,
    is_featured: true,
    max_participants: 10,
    min_participants: 1,
    location_type: "virtual",
    tags: ["mindfulness", "stress-relief", "anxiety", "breathwork", "spiritual"],
    image_url: "/diverse-fitness-group.png",
    average_rating: null,
    total_reviews: 0,
    total_bookings: 0,
    primary_practitioner: {
      id: "61a42db2-9df9-48b5-84bb-98f50eb9b74b",
      display_name: "Dr. Kathleen Richards",
      title: "Retail manager",
      is_verified: true,
      average_rating: "5.00",
      profile_image_url: "/confident-professional.png",
    },
    practitioners: [
      {
        id: "61a42db2-9df9-48b5-84bb-98f50eb9b74b",
        display_name: "Dr. Kathleen Richards",
        title: "Retail manager",
        is_verified: true,
        average_rating: "5.00",
        profile_image_url: "/confident-professional.png",
        is_primary: true,
        role: "host",
      },
      {
        id: "22870319-9eba-46f8-a2a3-759d66ce9649",
        display_name: "Dr. Annette Stout",
        title: "Museum/gallery conservator",
        is_verified: true,
        average_rating: "5.00",
        profile_image_url: "/confident-leader.png",
        is_primary: false,
        role: "guest",
      },
    ],
    sessions: [
      {
        id: 70,
        service: 37,
        title: "Session 3: Ergonomic multi-tasking open system",
        description: "Hope show fine find common measure share. Travel have least maybe call woman physical month.",
        start_time: "2025-04-11T06:24:08.424107Z",
        end_time: "2025-04-11T09:24:08.424107Z",
        max_participants: 10,
        current_participants: 0,
        available_spots: 10,
        sequence_number: 2,
        price: "311.63",
        status: "scheduled",
        created_at: "2025-04-08T19:24:08.425348Z",
        updated_at: "2025-04-08T19:24:08.425360Z",
        agenda: "Ten school several list policy quickly available. Consider place according executive into group.",
        what_youll_learn:
          "- Expert stage region either.\n- Sit if inside fish mission trial before wonder.\n- Reason policy or thank.",
        benefits: [],
        agenda_items: [],
        location: null,
      },
      {
        id: 68,
        service: 37,
        title: null,
        description:
          "Main tonight into certain. Smile speech performance evidence wait special player. Find child reason same population nearly.",
        start_time: "2025-04-16T19:24:07.892201Z",
        end_time: "2025-04-16T21:24:07.892201Z",
        max_participants: 10,
        current_participants: 0,
        available_spots: 10,
        sequence_number: 0,
        price: "311.63",
        status: "scheduled",
        created_at: "2025-04-08T19:24:07.893519Z",
        updated_at: "2025-04-08T19:24:07.893537Z",
        agenda: "By yeah maintain prevent. Success miss beyond. Nearly find stuff check fill.",
        what_youll_learn: "- Anyone outside cause nearly beautiful.\n- First either treat lawyer from.",
        benefits: [
          {
            id: 261,
            title: "Persevering demand-driven success",
            description: "Few pass forward husband.",
            icon: "certificate",
            order: 0,
          },
          {
            id: 262,
            title: "Business-focused eco-centric data-warehouse",
            description: null,
            icon: "crown",
            order: 1,
          },
          {
            id: 263,
            title: "Cloned eco-centric monitoring",
            description: null,
            icon: "certificate",
            order: 2,
          },
          {
            id: 264,
            title: "Expanded system-worthy Graphical User Interface",
            description:
              "Evening red president series. Daughter understand future official course executive. Sure everything since image ability series.",
            icon: "medal",
            order: 3,
          },
        ],
        agenda_items: [],
        location: null,
      },
      {
        id: 69,
        service: 37,
        title: "Session 2: Operative secondary interface",
        description:
          "Sometimes spring food machine. Of manager move hope word give pattern. Treatment be boy explain his.",
        start_time: "2025-04-21T01:24:08.334268Z",
        end_time: "2025-04-21T02:24:08.334268Z",
        max_participants: 10,
        current_participants: 0,
        available_spots: 10,
        sequence_number: 1,
        price: "311.63",
        status: "scheduled",
        created_at: "2025-04-08T19:24:08.335211Z",
        updated_at: "2025-04-08T19:24:08.335221Z",
        agenda: null,
        what_youll_learn:
          "- Now pass onto capital son they dinner.\n- Lose upon enjoy town most step decade.\n- Spring resource special exactly.\n- Market check stand job yes.",
        benefits: [],
        agenda_items: [],
        location: null,
      },
    ],
    child_relationships: [],
    is_course: false,
    is_package: false,
    total_package_price: null,
    agenda_items: [],
    benefits: [
      {
        id: 257,
        title: "Balanced coherent synergy",
        description:
          "Focus tonight old entire responsibility give young. Control subject sea north. Mr mind see ok TV country. Second miss condition score product easy note.",
        icon: "award",
        order: 0,
      },
      {
        id: 258,
        title: "Configurable composite productivity",
        description: "Capital national someone benefit tax. Site system itself by.",
        icon: "trophy",
        order: 1,
      },
      {
        id: 259,
        title: "Balanced 3rdgeneration matrices",
        description: "Discover finish three long speech onto. Future him goal hand foreign talk three.",
        icon: "thumbs-up",
        order: 2,
      },
      {
        id: 260,
        title: "Object-based national throughput",
        description: "Level media stay build group main. Expert system hope support.",
        icon: "thumbs-up",
        order: 3,
      },
    ],
    location: null,
    experience_level: "all_levels",
    languages: [
      {
        id: "43703cc3-2168-4fe5-9468-c40661604186",
        name: "Chinese",
        code: "zh",
      },
      {
        id: "33ec7852-537e-4b44-9771-8d5aa96abf51",
        name: "German",
        code: "de",
      },
      {
        id: "0f035d0d-f3cf-4606-bf93-38dee6d46802",
        name: "Japanese",
        code: "ja",
      },
    ],
    what_youll_learn:
      "- Represent various cause remain still student worry.\n- Talk once beat story available other.\n- Listen Congress provide perform down growth.\n- Could the tree data.\n- Instead would long study.\n- Task idea across when subject suffer would.",
    waitlist_count: 0,
    parent_category_details: null,
  }
}

// Update the getSessionById function to handle string service IDs
export async function getSessionById(id: number): Promise<Session | null> {
  // In a real app, this would fetch from an API
  // For demo purposes, we're returning mock data based on the ID
  const service = await getServiceById(37)
  if (!service) return null

  return service.sessions.find((session) => session.id === id) || null
}

// Mock function to get services by type
export async function getServicesByType(type: string): Promise<Service[]> {
  // In a real app, this would fetch from an API
  // For demo purposes, we're returning mock data
  if (type === "course") {
    return [await getServiceById(37)].filter(Boolean) as Service[]
  }

  return []
}

// Mock function to fetch practitioner services
export async function fetchPractitionerServices(): Promise<any[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  return [
    {
      id: "1",
      name: "Mindfulness Meditation Course",
      type: "course",
      description: "A comprehensive 8-week course teaching mindfulness meditation techniques.",
      price: 299,
      status: "published",
      coverImage: "/course-image-1.jpg",
      createdAt: "2023-09-15T10:30:00Z",
      updatedAt: "2023-10-01T14:45:00Z",
      sessions: 8,
      duration: 60,
      location: "online",
    },
    {
      id: "2",
      name: "One-on-One Coaching Session",
      type: "one_on_one",
      description: "Personal coaching session tailored to your specific needs and goals.",
      price: 120,
      status: "published",
      coverImage: "/session-image-1.jpg",
      createdAt: "2023-08-20T09:15:00Z",
      updatedAt: "2023-09-25T11:30:00Z",
      sessions: 1,
      duration: 60,
      location: "online",
    },
    {
      id: "3",
      name: "Weekend Wellness Retreat",
      type: "workshop",
      description: "A rejuvenating weekend workshop focused on wellness and self-care practices.",
      price: 450,
      status: "draft",
      coverImage: "/workshop-image-1.jpg",
      createdAt: "2023-10-05T16:20:00Z",
      updatedAt: "2023-10-10T13:40:00Z",
      sessions: 1,
      duration: 480,
      location: "in_person",
    },
    {
      id: "4",
      name: "Stress Management Package",
      type: "package",
      description: "A comprehensive package of 5 sessions designed to help you manage stress effectively.",
      price: 500,
      status: "published",
      coverImage: "/package-image-1.jpg",
      createdAt: "2023-07-12T14:10:00Z",
      updatedAt: "2023-08-05T09:25:00Z",
      sessions: 5,
      duration: 60,
      location: "hybrid",
    },
    {
      id: "5",
      name: "Leadership Development Program",
      type: "course",
      description: "A 12-week program to develop essential leadership skills for professionals.",
      price: 899,
      status: "published",
      coverImage: "/course-image-2.jpg",
      createdAt: "2023-06-18T11:05:00Z",
      updatedAt: "2023-07-22T15:30:00Z",
      sessions: 12,
      duration: 90,
      location: "online",
    },
    {
      id: "6",
      name: "Wellness Bundle",
      type: "bundle",
      description: "A complete wellness bundle including meditation course, coaching sessions, and workshop access.",
      price: 1200,
      status: "draft",
      coverImage: "/workshop-image-2.jpg",
      createdAt: "2023-09-30T10:15:00Z",
      updatedAt: "2023-10-12T16:45:00Z",
      sessions: 15,
      duration: 60,
      location: "online",
    },
  ]
}
