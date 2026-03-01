import { differenceInDays, format } from "date-fns"

// Types for meta pill items
export interface MetaItem {
  icon: string // lucide icon name
  label: string
  value: string
}

// Attention state
export interface AttentionState {
  message: string
  severity: "error" | "warning"
}

/**
 * Returns type-specific metadata items for a service, used by both card and list views.
 */
export function getTypeSpecificMeta(service: any): MetaItem[] {
  const type = normalizeServiceType(service.service_type_code || service.type)
  const items: MetaItem[] = []

  switch (type) {
    case "session":
      items.push({ icon: "DollarSign", label: "Price", value: `$${service.price}` })
      if (service.duration) {
        items.push({ icon: "Clock", label: "Duration", value: `${service.duration} min` })
      }
      items.push({ icon: "Users", label: "Bookings", value: `${service.total_bookings || service.bookings || 0}` })
      if (service.average_rating && parseFloat(service.average_rating) > 0) {
        items.push({ icon: "Star", label: "Rating", value: `${parseFloat(service.average_rating).toFixed(1)}` })
      }
      break

    case "workshop":
      items.push({ icon: "DollarSign", label: "Price", value: `$${service.price}` })
      if (service.duration) {
        items.push({ icon: "Clock", label: "Duration", value: `${service.duration} min` })
      }
      if (service.next_session_date) {
        items.push({
          icon: "Calendar",
          label: "Next",
          value: format(new Date(service.next_session_date), "MMM d"),
        })
      }
      if (service.max_participants) {
        items.push({
          icon: "Users",
          label: "Capacity",
          value: `${service.total_bookings || service.bookings || 0}/${service.max_participants}`,
        })
      } else {
        items.push({ icon: "Users", label: "Bookings", value: `${service.total_bookings || service.bookings || 0}` })
      }
      break

    case "course":
      items.push({ icon: "DollarSign", label: "Price", value: `$${service.price}` })
      if (service.sessions && service.sessions > 1) {
        items.push({ icon: "BookOpen", label: "Modules", value: `${service.sessions}` })
      }
      items.push({ icon: "Users", label: "Enrolled", value: `${service.total_bookings || service.bookings || 0}` })
      if (service.next_session_date) {
        items.push({
          icon: "Calendar",
          label: "Next",
          value: format(new Date(service.next_session_date), "MMM d"),
        })
      }
      break

    case "bundle":
    case "package":
      items.push({ icon: "DollarSign", label: "Price", value: `$${service.price}` })
      items.push({ icon: "ShoppingBag", label: "Sold", value: `${service.total_bookings || service.bookings || 0}` })
      break

    default:
      items.push({ icon: "DollarSign", label: "Price", value: `$${service.price}` })
      if (service.duration) {
        items.push({ icon: "Clock", label: "Duration", value: `${service.duration} min` })
      }
      items.push({ icon: "Users", label: "Bookings", value: `${service.total_bookings || service.bookings || 0}` })
      break
  }

  return items
}

/**
 * Returns an attention state if the service needs attention, or null.
 */
export function getAttentionState(service: any): AttentionState | null {
  // Service has ended but is still active
  if (service.has_ended && service.status === "active") {
    return {
      message: "This service has ended — consider archiving or adding new dates",
      severity: "error",
    }
  }

  // Workshop starting soon (within 3 days)
  const type = normalizeServiceType(service.service_type_code || service.type)
  if (type === "workshop" && service.next_session_date) {
    const daysUntil = differenceInDays(new Date(service.next_session_date), new Date())
    if (daysUntil >= 0 && daysUntil <= 3) {
      return {
        message: daysUntil === 0 ? "Starting today" : `Starting in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`,
        severity: "warning",
      }
    }
  }

  // Draft and not purchasable
  if (service.status === "draft" && service.is_purchasable === false) {
    return {
      message: "Incomplete — not yet bookable",
      severity: "warning",
    }
  }

  return null
}

function normalizeServiceType(type: string): string {
  if (!type) return "session"
  const normalized = type.toLowerCase().replace(/[-\s]/g, "_")
  if (normalized === "in_person_session" || normalized === "online_session" || normalized === "one_on_one") {
    return "session"
  }
  return normalized
}
