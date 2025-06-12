import type { FeedPost, Comment, SubscriptionTier } from "@/types/feed"

// Mock feed posts
export const mockFeedPosts: FeedPost[] = [
  {
    id: "post1",
    practitionerId: "pract1",
    content:
      "Just finished an amazing meditation session with my group! The energy in the room was incredible. Here are some photos from our sacred space. #meditation #mindfulness #community",
    mediaUrls: ["/serene-meditation.png", "/mindful-moments.png"],
    mediaType: "image",
    isPremium: false,
    createdAt: "2023-11-15T14:30:00Z",
    likes: 24,
    comments: 5,
    tags: ["meditation", "mindfulness", "community"],
  },
  {
    id: "post2",
    practitionerId: "pract1",
    content:
      "I'm excited to share my latest guided meditation for stress relief. This 20-minute practice has helped many of my clients find peace during challenging times. Premium subscribers can access the full audio recording below.",
    mediaUrls: ["/guiding-light-path.png"],
    mediaType: "image",
    isPremium: true,
    createdAt: "2023-11-12T09:15:00Z",
    likes: 42,
    comments: 8,
    attachments: [
      {
        id: "att1",
        name: "Stress Relief Meditation.mp3",
        url: "#",
        type: "audio/mp3",
        size: 18500000,
      },
    ],
    tags: ["meditation", "stress-relief", "premium-content"],
  },
  {
    id: "post3",
    practitionerId: "pract1",
    content:
      "Quick tip for maintaining mindfulness throughout your day: Set gentle reminders on your phone to take three deep breaths. This simple practice can reset your nervous system and bring you back to the present moment.",
    mediaUrls: [],
    isPremium: false,
    createdAt: "2023-11-10T16:45:00Z",
    likes: 18,
    comments: 3,
    tags: ["mindfulness", "quick-tip", "breathing"],
  },
  {
    id: "post4",
    practitionerId: "pract1",
    content:
      "I've just released a new video on the science of breathwork and its effects on anxiety. This is part of my exclusive content for subscribers where I dive deeper into the techniques I use in my practice.",
    mediaUrls: ["/mindful-breath.png"],
    mediaType: "video",
    isPremium: true,
    createdAt: "2023-11-08T11:20:00Z",
    likes: 36,
    comments: 7,
    tags: ["breathwork", "anxiety", "science", "premium-content"],
  },
  {
    id: "post5",
    practitionerId: "pract1",
    content:
      "Spent the weekend at a beautiful retreat in the mountains. Reconnecting with nature is such a powerful way to restore balance. What are your favorite ways to connect with the natural world?",
    mediaUrls: ["/winding-mountain-road.png", "/secluded-mountain-cabin.png", "/serene-forest-meditation.png"],
    mediaType: "image",
    isPremium: false,
    createdAt: "2023-11-05T18:30:00Z",
    likes: 51,
    comments: 12,
    tags: ["nature", "retreat", "balance"],
  },
]

// Mock comments
export const mockComments: Record<string, Comment[]> = {
  post1: [
    {
      id: "comment1",
      postId: "post1",
      userId: "user1",
      userFullName: "Sarah Johnson",
      userProfilePicture: "/abstract-user-icon.png",
      content: "The space looks so peaceful! I'd love to join one of these sessions someday.",
      createdAt: "2023-11-15T15:10:00Z",
      likes: 3,
    },
    {
      id: "comment2",
      postId: "post1",
      userId: "user2",
      userFullName: "Michael Chen",
      userProfilePicture: "/images/avatar-2.png",
      content: "I've been attending these sessions for months now and they've transformed my daily practice.",
      createdAt: "2023-11-15T16:05:00Z",
      likes: 5,
    },
  ],
  post2: [
    {
      id: "comment3",
      postId: "post2",
      userId: "user3",
      userFullName: "Emma Wilson",
      userProfilePicture: "/placeholder.svg?height=50&width=50&query=user%20avatar%203",
      content: "Just subscribed to access this! Your guided meditations have been helping me sleep better.",
      createdAt: "2023-11-12T10:30:00Z",
      likes: 2,
    },
  ],
}

// Mock subscription tiers
export const mockSubscriptionTiers: SubscriptionTier[] = [
  {
    id: "tier1",
    practitionerId: "pract1",
    name: "Mindful Explorer",
    description: "Access to exclusive content and monthly Q&A sessions",
    price: 9.99,
    billingCycle: "monthly",
    features: ["Access to premium posts and content", "Monthly group Q&A session", "Downloadable meditation guides"],
  },
  {
    id: "tier2",
    practitionerId: "pract1",
    name: "Wellness Journey",
    description: "Everything in Explorer plus personalized guidance",
    price: 24.99,
    billingCycle: "monthly",
    features: [
      "All Explorer benefits",
      "Bi-weekly personalized practice recommendations",
      "Priority booking for workshops",
      "Exclusive subscriber-only workshops",
    ],
    isPopular: true,
  },
  {
    id: "tier3",
    practitionerId: "pract1",
    name: "Transformation Path",
    description: "The ultimate personalized wellness journey",
    price: 199.99,
    billingCycle: "quarterly",
    features: [
      "All Journey benefits",
      "Monthly 1-on-1 virtual session (30 min)",
      "Personalized wellness plan",
      "Direct messaging with practitioner",
      "Early access to new programs and content",
    ],
  },
]
