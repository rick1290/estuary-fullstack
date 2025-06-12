export interface TimeSlot {
  id: string
  day: number // 0 = Monday, 6 = Sunday
  day_name: string
  start_time: string
  end_time: string
  is_active: boolean
}

export interface Schedule {
  id: string
  name: string
  description?: string
  is_default: boolean
  timezone: string
  is_active: boolean
  time_slots: TimeSlot[]
}

export type WeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"

export const DAYS_OF_WEEK: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export const TIME_OPTIONS = [
  "00:00",
  "00:30",
  "01:00",
  "01:30",
  "02:00",
  "02:30",
  "03:00",
  "03:30",
  "04:00",
  "04:30",
  "05:00",
  "05:30",
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
]

export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
]

// Helper function to check if two time slots overlap
export function doTimeSlotOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  if (slot1.day !== slot2.day) return false

  const start1 = new Date(`1970-01-01T${slot1.start_time}`)
  const end1 = new Date(`1970-01-01T${slot1.end_time}`)
  const start2 = new Date(`1970-01-01T${slot2.start_time}`)
  const end2 = new Date(`1970-01-01T${slot2.end_time}`)

  return start1 < end2 && start2 < end1
}

// Helper function to format time in 12-hour format
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":")
  const hour = Number.parseInt(hours, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}
