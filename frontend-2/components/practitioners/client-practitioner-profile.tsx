"use client"

import { useEffect, useState } from "react"
import PractitionerProfile from "./practitioner-profile"
import type { Practitioner } from "@/types/practitioner"

interface ClientPractitionerProfileProps {
  practitioner: Practitioner
}

export default function ClientPractitionerProfile({ practitioner }: ClientPractitionerProfileProps) {
  const [isLiked, setIsLiked] = useState(false)

  // Load liked state from localStorage on mount
  useEffect(() => {
    try {
      const savedLikes = JSON.parse(localStorage.getItem("likedPractitioners") || "{}")
      const practitionerId = practitioner.public_uuid || practitioner.id
      setIsLiked(!!savedLikes[practitionerId])
    } catch (error) {
      console.error("Error loading liked state:", error)
    }
  }, [practitioner.public_uuid, practitioner.id])

  return <PractitionerProfile practitioner={practitioner} initialLiked={isLiked} />
}
