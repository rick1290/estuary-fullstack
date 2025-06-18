import { useQuery } from "@tanstack/react-query"
import { 
  serviceCategoriesListOptions,
  practitionerCategoriesListOptions 
} from "@/src/client/@tanstack/react-query.gen"

export function useServiceCategories() {
  const query = useQuery(serviceCategoriesListOptions())
  
  // Handle both direct response and wrapped response formats
  let results = []
  if (query.data) {
    // Check if response is wrapped in status/data structure
    if ('status' in query.data && 'data' in query.data) {
      results = (query.data as any).data?.results || []
    } else {
      // Direct response format
      results = query.data?.results || []
    }
  }
  
  console.log('Service categories:', { rawData: query.data, results })
  
  return {
    ...query,
    data: results
  }
}

export function usePractitionerCategories() {
  const query = useQuery(practitionerCategoriesListOptions())
  
  // Handle both direct response and wrapped response formats
  let results = []
  if (query.data) {
    // Check if response is wrapped in status/data structure
    if ('status' in query.data && 'data' in query.data) {
      results = (query.data as any).data?.results || []
    } else {
      // Direct response format
      results = query.data?.results || []
    }
  }
  
  console.log('Practitioner categories:', { rawData: query.data, results })
  
  return {
    ...query,
    data: results
  }
}