"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./use-auth"
import { userFavorites } from "@/src/client/sdk.gen"
import type { Practitioner } from "@/types/practitioner"

interface UseUserFavoritesReturn {
  favoritePractitionerIds: Set<number>
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useUserFavorites(): UseUserFavoritesReturn {
  const [favoritePractitionerIds, setFavoritePractitionerIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { isAuthenticated } = useAuth()

  const fetchFavorites = async () => {
    if (!isAuthenticated) {
      setFavoritePractitionerIds(new Set())
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await userFavorites()
      
      if (response.data?.results) {
        const practitionerIds = new Set(
          response.data.results.map((practitioner: Practitioner) => practitioner.id)
        )
        setFavoritePractitionerIds(practitionerIds)
        
        // Also sync with localStorage for offline access
        const favoritesObj: Record<string, boolean> = {}
        practitionerIds.forEach(id => {
          favoritesObj[id] = true
        })
        localStorage.setItem("likedPractitioners", JSON.stringify(favoritesObj))
      }
    } catch (err) {
      console.error("Error fetching user favorites:", err)
      setError(err as Error)
      
      // Fall back to localStorage if API fails
      try {
        const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
        const ids = new Set(
          Object.entries(savedLikes)
            .filter(([_, liked]) => liked)
            .map(([id]) => parseInt(id))
            .filter(id => !isNaN(id))
        )
        setFavoritePractitionerIds(ids)
      } catch {
        // If localStorage is also corrupted, just use empty set
        setFavoritePractitionerIds(new Set())
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFavorites()
  }, [isAuthenticated])

  return {
    favoritePractitionerIds,
    isLoading,
    error,
    refetch: fetchFavorites
  }
}