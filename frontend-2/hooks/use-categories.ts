import { useQuery } from "@tanstack/react-query"
import { 
  serviceCategoriesListOptions,
  practitionerCategoriesListOptions 
} from "@/src/client/@tanstack/react-query.gen"

export function useServiceCategories() {
  const query = useQuery(serviceCategoriesListOptions())
  return {
    ...query,
    data: query.data?.results || []
  }
}

export function usePractitionerCategories() {
  const query = useQuery(practitionerCategoriesListOptions())
  console.log('Practitioner categories query data:', query.data)
  return {
    ...query,
    data: query.data?.results || []
  }
}