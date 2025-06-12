// Service type configuration for consistent styling across the application
export const SERVICE_TYPE_CONFIG = {
  course: {
    label: "Course",
    color: "primary", // Changed from "info" to "primary"
    bgColor: "#e3f2fd", // Light blue background
    textColor: "#0288d1", // Darker blue text
    variant: "default", // Added for shadcn Badge
    icon: "GraduationCap", // Added icon name
  },
  workshop: {
    label: "Workshop",
    color: "secondary", // Changed from "success" to "secondary"
    bgColor: "#e8f5e9", // Light green background
    textColor: "#2e7d32", // Darker green text
    variant: "secondary", // Added for shadcn Badge
    icon: "Calendar", // Added icon name
  },
  one_on_one: {
    label: "1-on-1 Session",
    color: "primary", // Primary color (our teal)
    bgColor: "#e0f2f1", // Light teal background
    textColor: "#014451", // Our brand color
    variant: "default", // Added for shadcn Badge
    icon: "User", // Added icon name
  },
  session: {
    label: "Session",
    color: "primary", // Primary color (our teal)
    bgColor: "#e0f2f1", // Light teal background
    textColor: "#014451", // Our brand color
    variant: "default", // Added for shadcn Badge
    icon: "User", // Added icon name
  },
  package: {
    label: "Package",
    color: "secondary", // Purple
    bgColor: "#f3e5f5", // Light purple background
    textColor: "#7b1fa2", // Darker purple text
    variant: "secondary", // Added for shadcn Badge
    icon: "ShoppingBag", // Added icon name
  },
  bundle: {
    label: "Bundle",
    color: "warning", // Orange
    bgColor: "#fff3e0", // Light orange background
    textColor: "#ef6c00", // Darker orange text
    variant: "outline", // Added for shadcn Badge
    icon: "Package", // Added icon name
  },
}

// Export for backward compatibility
export const serviceTypeConfig = SERVICE_TYPE_CONFIG

// Helper function to get service type config with fallback
export function getServiceTypeConfig(type: string) {
  // Normalize the type by converting to lowercase and removing spaces/hyphens
  const normalizedType = type.toLowerCase().replace(/[-\s]/g, "_")

  // Handle "one-on-one" and "session" as the same type
  if (normalizedType === "one_on_one" || normalizedType === "session") {
    return SERVICE_TYPE_CONFIG.one_on_one
  }

  return (
    SERVICE_TYPE_CONFIG[normalizedType as keyof typeof SERVICE_TYPE_CONFIG] || {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      color: "default",
      bgColor: "#f5f5f5",
      textColor: "#757575",
      variant: "outline",
      icon: "Circle",
    }
  )
}
