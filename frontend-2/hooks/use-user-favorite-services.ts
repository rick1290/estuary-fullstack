"use client"

import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { userFavoriteServicesOptions } from "@/src/client/@tanstack/react-query.gen"
import { useAuth } from "./use-auth"

export function useUserFavoriteServices() {
  const { isAuthenticated } = useAuth()

  // Fetch user's favorite services from API when authenticated
  const { data, isLoading, error, refetch } = useQuery({
    ...userFavoriteServicesOptions(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Extract service IDs and create a Set for efficient lookups
  const favoriteServiceIds = useMemo(() => {
    const ids = new Set<string>()
    
    if (isAuthenticated && data?.results) {
      // Add IDs from API response
      data.results.forEach((service: any) => {
        if (service.id) ids.add(service.id.toString())
        if (service.public_uuid) ids.add(service.public_uuid)
      })
    } else if (!isAuthenticated) {
      // If not authenticated, load from localStorage
      try {
        const savedServices = JSON.parse(localStorage.getItem("savedServices") || "{}")
        Object.keys(savedServices).forEach(id => {
          if (savedServices[id]) ids.add(id)
        })
      } catch (error) {
        console.error("Error loading saved services from localStorage:", error)
      }
    }
    
    return ids
  }, [data, isAuthenticated])

  // Sync localStorage when data changes (for offline access)
  useEffect(() => {
    if (isAuthenticated && data?.results) {
      try {
        const savedServices: Record<string, boolean> = {}
        data.results.forEach((service: any) => {
          const id = service.id || service.public_uuid
          if (id) savedServices[id] = true
        })
        localStorage.setItem("savedServices", JSON.stringify(savedServices))
      } catch (error) {
        console.error("Error syncing saved services to localStorage:", error)
      }
    }
  }, [data, isAuthenticated])

  return {
    favoriteServiceIds,
    isLoading,
    error,
    refetch,
  }
}