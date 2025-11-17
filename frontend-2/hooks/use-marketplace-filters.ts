"use client"

import { useCallback, useMemo } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

export interface MarketplaceFilters {
  modalities: string[]
  categories: string[]
  serviceType: string
  locationFormat: string
  location: string
  distance: number
  minPrice: number
  maxPrice: number
  rating: string
  search: string
}

/**
 * Custom hook for managing marketplace filters with URL as source of truth
 * Follows Next.js App Router best practices
 */
export function useMarketplaceFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Parse filters from URL - this is the source of truth
  const filters = useMemo((): MarketplaceFilters => {
    return {
      modalities: searchParams.get('modality')?.split(',').filter(Boolean) || [],
      categories: searchParams.get('category')?.split(',').filter(Boolean) || [],
      serviceType: searchParams.get('type') || 'all',
      locationFormat: searchParams.get('format') || 'all',
      location: searchParams.get('location') || '',
      distance: parseInt(searchParams.get('distance') || '25'),
      minPrice: parseInt(searchParams.get('minPrice') || '0'),
      maxPrice: parseInt(searchParams.get('maxPrice') || '500'),
      rating: searchParams.get('rating') || 'any',
      search: searchParams.get('q') || '',
    }
  }, [searchParams])

  // Update a single filter and push to URL
  const updateFilter = useCallback((key: keyof MarketplaceFilters, value: any) => {
    const params = new URLSearchParams(searchParams.toString())

    if (Array.isArray(value)) {
      // For array values (modalities, categories)
      params.delete(getParamKey(key))
      if (value.length > 0) {
        params.set(getParamKey(key), value.join(','))
      }
    } else if (value === null || value === undefined || value === '' || value === 'all' || value === 'any') {
      // Remove param if empty/default
      params.delete(getParamKey(key))
    } else {
      // Set param for all other values
      params.set(getParamKey(key), String(value))
    }

    // Navigate with new params
    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  // Update multiple filters at once
  const updateFilters = useCallback((updates: Partial<MarketplaceFilters>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      const paramKey = getParamKey(key as keyof MarketplaceFilters)

      if (Array.isArray(value)) {
        params.delete(paramKey)
        if (value.length > 0) {
          params.set(paramKey, value.join(','))
        }
      } else if (value === null || value === undefined || value === '' || value === 'all' || value === 'any') {
        params.delete(paramKey)
      } else {
        params.set(paramKey, String(value))
      }
    })

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  // Reset all filters (keep only search query)
  const resetFilters = useCallback(() => {
    const params = new URLSearchParams()
    const query = searchParams.get('q')
    if (query) params.set('q', query)

    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [router, pathname, searchParams])

  // Toggle a value in an array filter (modalities, categories)
  const toggleArrayFilter = useCallback((key: 'modalities' | 'categories', value: string) => {
    const current = filters[key]
    const newValue = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    updateFilter(key, newValue)
  }, [filters, updateFilter])

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    toggleArrayFilter,
  }
}

// Helper to map filter keys to URL param keys
function getParamKey(key: keyof MarketplaceFilters): string {
  const mapping: Record<keyof MarketplaceFilters, string> = {
    modalities: 'modality',
    categories: 'category',
    serviceType: 'type',
    locationFormat: 'format',
    location: 'location',
    distance: 'distance',
    minPrice: 'minPrice',
    maxPrice: 'maxPrice',
    rating: 'rating',
    search: 'q',
  }
  return mapping[key]
}
