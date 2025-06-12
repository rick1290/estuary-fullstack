export interface StreamPost {
  id: string
  practitionerId: string
  practitionerName: string
  practitionerImage: string
  content: string
  mediaUrls: string[]
  contentType: "video" | "image" | "article" | "audio"
  isPremium: boolean
  createdAt: string
  likes: number
  comments: number
  views: number
  tags: string[]
  isLiked?: boolean
  isSaved?: boolean
  commentsList?: StreamComment[]
}

export interface StreamComment {
  id: string
  postId: string
  userId: string
  userName: string
  userImage: string
  content: string
  createdAt: string
  likes: number
}

export interface FeaturedPractitioner {
  id: string
  name: string
  image: string
  coverImage: string
  title: string
  tags: string[]
  subscriberCount: number
  postCount: number
}
