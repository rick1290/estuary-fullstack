"use client"

import HeroSection from "@/components/home/hero-section"
import FeaturedPractitionersSection from "@/components/home/featured-practitioners-section"
import UpcomingWorkshopsSection from "@/components/home/upcoming-workshops-section"
import TestimonialsStrip from "@/components/home/testimonials-strip"
import ExploreFormatsSection from "@/components/home/explore-formats-section"
import StreamsTeaserSection from "@/components/home/streams-teaser-section"
import BecomePractitionerSection from "@/components/home/become-practitioner-section"

export default function Home() {
  return (
    <main className="bg-cream-50">
      <HeroSection />
      <div className="h-px bg-sage-200/60 mx-6" />
      <FeaturedPractitionersSection />
      <div className="h-px bg-sage-200/60 mx-6" />
      <UpcomingWorkshopsSection />
      <div className="h-px bg-sage-200/60 mx-6" />
      <TestimonialsStrip />
      <div className="h-px bg-sage-200/60 mx-6" />
      <ExploreFormatsSection />
      <div className="h-px bg-sage-200/60 mx-6" />
      <StreamsTeaserSection />
      <div className="h-px bg-sage-200/60 mx-6" />
      <BecomePractitionerSection />
    </main>
  )
}
