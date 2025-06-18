// For future use with API endpoint
// import { useQuery } from "@tanstack/react-query"

// For now, we'll use static service types that match the backend enums
// In the future, these could come from an API endpoint
export const SERVICE_TYPES = [
  {
    id: 1,
    code: 'session',
    name: 'Session',
    label: 'One-on-One Session',
    description: 'Individual sessions with clients',
    features: [
      'Personalized attention',
      'Flexible scheduling', 
      'Direct client interaction',
      'Custom pricing per session'
    ]
  },
  {
    id: 2,
    code: 'workshop',
    name: 'Workshop',
    label: 'Workshop',
    description: 'Interactive group learning experience with scheduled sessions',
    features: [
      'Group activities',
      'Scheduled dates/times',
      'Multiple sessions possible',
      'Collaborative learning'
    ]
  },
  {
    id: 3,
    code: 'course',
    name: 'Course',
    label: 'Course',
    description: 'Multi-session educational program with structured curriculum',
    features: [
      'Structured curriculum',
      'Multiple sequential sessions',
      'Progressive learning',
      'Comprehensive experience'
    ]
  },
  {
    id: 4,
    code: 'package',
    name: 'Package',
    label: 'Package',
    description: 'Bundle different services together at a special rate',
    features: [
      'Mix of different services',
      'Discounted pricing',
      'Customizable combinations',
      'Value for clients'
    ]
  },
  {
    id: 5,
    code: 'bundle',
    name: 'Bundle',
    label: 'Bundle',
    description: 'Multiple sessions of the same service sold as a package',
    features: [
      'Bulk sessions discount',
      'Same service repeated',
      'Flexible redemption',
      'Cost savings for clients'
    ]
  }
]

export function useServiceTypes() {
  // For now, return static data
  // In the future, this could be replaced with an API call
  return {
    data: SERVICE_TYPES,
    isLoading: false,
    error: null
  }
}

export function getServiceTypeById(id: number) {
  return SERVICE_TYPES.find(type => type.id === id)
}

export function getServiceTypeByCode(code: string) {
  return SERVICE_TYPES.find(type => type.code === code)
}