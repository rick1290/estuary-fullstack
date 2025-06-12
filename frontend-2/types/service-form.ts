export interface ServiceFormData {
  type: string
  title: string
  description: string
  price: number
  duration: number
  capacity: number
  sessions: Array<{
    title: string
    description: string
    date?: string
    startTime?: string
    endTime?: string
  }>
  media: {
    coverImage: string
    gallery: string[]
  }
  practitioner: {
    bio: string
    expertise: string[]
  }
  learningGoals: string[]
  location: {
    type: "online" | "in-person" | "hybrid"
    address: string
    online: {
      platform: string
      link: string
    }
  }
  availability: {
    schedules: Array<{
      id: string
      name: string
      timeSlots: Array<{
        day: string
        startTime: string
        endTime: string
      }>
    }>
  }
}
