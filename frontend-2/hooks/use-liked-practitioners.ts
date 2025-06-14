"use client"

import { useState, useEffect } from "react"

export function useLikedPractitioners() {
  const [likedPractitioners, setLikedPractitioners] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load liked practitioners from localStorage on mount
  useEffect(() => {
    try {
      const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
      setLikedPractitioners(savedLikes)
    } catch (error) {
      console.error("Error loading liked practitioners:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save to localStorage whenever likedPractitioners changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("likedPractitioners", JSON.stringify(likedPractitioners))
    }
  }, [likedPractitioners, isLoading])

  // Toggle a practitioner's liked status
  const toggleLike = (practitionerId: string) => {
    setLikedPractitioners((prev) => ({
      ...prev,
      [practitionerId]: !prev[practitionerId],
    }))
  }

  // Check if a practitioner is liked
  const isLiked = (practitionerId: string) => {
    return !!likedPractitioners[practitionerId]
  }

  // Get all liked practitioners' IDs
  const getLikedPractitionerIds = () => {
    return Object.entries(likedPractitioners)
      .filter(([_, isLiked]) => isLiked)
      .map(([id]) => id)
  }

  return {
    isLiked,
    toggleLike,
    getLikedPractitionerIds,
    isLoading,
  }
}
