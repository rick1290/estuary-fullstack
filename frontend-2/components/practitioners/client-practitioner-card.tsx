"use client"

import { useEffect, useState } from "react"
import PractitionerCard from "./practitioner-card"
import type { Practitioner } from "@/types/practitioner"

interface ClientPractitionerCardProps {
  practitioner: Practitioner
}

export default function ClientPractitionerCard({ practitioner }: ClientPractitionerCardProps) {
  const [isLiked, setIsLiked] = useState(false)

  // Load liked state from localStorage on mount
  useEffect(() => {
    try {
      const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
      setIsLiked(!!savedLikes[practitioner.id])
    } catch (error) {
      console.error("Error loading liked state:", error)
    }
  }, [practitioner.id])

  return <PractitionerCard practitioner={practitioner} initialLiked={isLiked} />
}
