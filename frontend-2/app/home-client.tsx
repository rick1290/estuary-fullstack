"use client"

import HeroSection from "@/components/home/hero-section"
import FeaturedPractitionersSection from "@/components/home/featured-practitioners-section"
import WhatsHappeningSection from "@/components/home/whats-happening-section"
import SocialProofStrip from "@/components/home/social-proof-strip"
import ExploreCategoriesSection from "@/components/home/explore-categories-section"
import BrowseModalitiesSection from "@/components/home/browse-modalities-section"
import StreamsTeaserSection from "@/components/home/streams-teaser-section"
import PractitionerCtaSection from "@/components/home/practitioner-cta-section"

export default function Home() {
  return (
    <main className="bg-[#f8f5f0]">
      <HeroSection />
      <FeaturedPractitionersSection />
      <WhatsHappeningSection />
      <SocialProofStrip />
      <ExploreCategoriesSection />
      <BrowseModalitiesSection />
      <StreamsTeaserSection />
      <PractitionerCtaSection />
    </main>
  )
}
