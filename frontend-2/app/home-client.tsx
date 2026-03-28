"use client"

import HeroSection from "@/components/home/hero-section"
import FeaturedPractitionersSection from "@/components/home/featured-practitioners-section"
import UpcomingWorkshopsSection from "@/components/home/upcoming-workshops-section"
import TestimonialsStrip from "@/components/home/testimonials-strip"
import ExploreFormatsSection from "@/components/home/explore-formats-section"
import BrowseModalitiesSection from "@/components/home/browse-modalities-section"
import StreamsTeaserSection from "@/components/home/streams-teaser-section"
import BecomePractitionerSection from "@/components/home/become-practitioner-section"

export default function Home() {
  return (
    <main className="bg-[#f8f5f0]">
      <HeroSection />
      <FeaturedPractitionersSection />
      <UpcomingWorkshopsSection />
      <TestimonialsStrip />
      <ExploreFormatsSection />
      <BrowseModalitiesSection />
      <StreamsTeaserSection />
      <BecomePractitionerSection />
    </main>
  )
}
