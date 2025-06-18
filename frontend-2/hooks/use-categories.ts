import { useQuery } from "@tanstack/react-query"
import { 
  serviceCategoriesListOptions,
  practitionerCategoriesListOptions 
} from "@/src/client/@tanstack/react-query.gen"

export function useServiceCategories() {
  return useQuery({
    ...serviceCategoriesListOptions(),
    select: (data) => data?.results || []
  })
}

export function usePractitionerCategories() {
  return useQuery({
    ...practitionerCategoriesListOptions(),
    select: (data) => data?.results || []
  })
}