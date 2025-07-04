"use client"

import { useEffect, useState } from "react"
import PractitionerRowCard from "./practitioner-row-card"
import type { Practitioner } from "@/types/practitioner"

interface ClientPractitionerRowCardProps {
  practitioner: Practitioner
}

export default function ClientPractitionerRowCard({ practitioner }: ClientPractitionerRowCardProps) {
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    // Check if this practitioner is liked
    try {
      const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
      const practitionerId = practitioner.public_uuid || practitioner.id
      setIsLiked(savedLikes[practitionerId] || false)
    } catch (error) {
      console.error("Error loading liked status:", error)
    }
  }, [practitioner.public_uuid, practitioner.id])

  return <PractitionerRowCard practitioner={practitioner} initialLiked={isLiked} />
}