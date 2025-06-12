"use client"

import React from "react"
import HeroSection from "@/components/home/hero-section"
import UpcomingWorkshopsSection from "@/components/home/upcoming-workshops-section"
import FeaturedPractitionersSection from "@/components/home/featured-practitioners-section"
import ExploreFormatsSection from "@/components/home/explore-formats-section"
import StreamsTeaserSection from "@/components/home/streams-teaser-section"
import EmailSignupSection from "@/components/home/email-signup-section"
import BecomePractitionerSection from "@/components/home/become-practitioner-section"
import SectionConnector from "@/components/home/section-connector"

export default function Home() {
  // This array defines the order of sections
  // To reorder, simply change the array order
  const sections = [
    { id: "hero", component: <HeroSection /> },
    { id: "featured-practitioners", component: <FeaturedPractitionersSection /> },
    { id: "upcoming-workshops", component: <UpcomingWorkshopsSection /> },
    { id: "explore-formats", component: <ExploreFormatsSection /> },
    { id: "streams-teaser", component: <StreamsTeaserSection /> },
    { id: "email-signup", component: <EmailSignupSection /> },
    { id: "become-practitioner", component: <BecomePractitionerSection /> },
  ]

  // Define section background colors for connectors - cleaner, minimal palette
  const sectionColors = {
    hero: "white",
    "upcoming-workshops": "#fefaf1", // warm-100
    "featured-practitioners": "white",
    "explore-formats": "#f5f5f5", // gray-100
    "streams-teaser": "#fafafa", // gray-50
    "email-signup": "white",
    "become-practitioner": "#fefaf1", // warm-100
  }

  // Define connector types between sections
  const connectorTypes = {
    "hero-featured-practitioners": "wave",
    "featured-practitioners-upcoming-workshops": "curve",
    "upcoming-workshops-explore-formats": "wave",
    "explore-formats-streams-teaser": "angle",
    "streams-teaser-email-signup": "wave",
    "email-signup-become-practitioner": "curve",
  }

  return (
    <main className="overflow-hidden">
      {sections.map((section, index) => {
        const prevSection = index > 0 ? sections[index - 1] : null
        const connectorKey = prevSection ? `${prevSection.id}-${section.id}` : null

        return (
          <React.Fragment key={section.id}>
            {/* Add connector between sections */}
            {index > 0 && connectorKey && (
              <SectionConnector
                type={connectorTypes[connectorKey] || "wave"}
                fromColor={typeof sectionColors[prevSection.id] === "string" ? sectionColors[prevSection.id] : "white"}
                toColor={typeof sectionColors[section.id] === "string" ? sectionColors[section.id] : "white"}
                flip={index % 2 === 0}
              />
            )}
            <div className="w-full">{section.component}</div>
          </React.Fragment>
        )
      })}
    </main>
  )
}
