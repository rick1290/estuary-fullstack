"use client"

import type { JourneyListItem } from "./use-journeys"
import JourneyCardCourse from "./journey-card-course"
import JourneyCardPackage from "./journey-card-package"
import JourneyCardSession from "./journey-card-session"
import JourneyCardWorkshop from "./journey-card-workshop"

interface JourneyCardProps {
  journey: JourneyListItem
}

export default function JourneyCard({ journey }: JourneyCardProps) {
  switch (journey.journey_type) {
    case "course":
      return <JourneyCardCourse journey={journey} />
    case "package":
    case "bundle":
      return <JourneyCardPackage journey={journey} />
    case "workshop":
      return <JourneyCardWorkshop journey={journey} />
    case "session":
    default:
      return <JourneyCardSession journey={journey} />
  }
}
