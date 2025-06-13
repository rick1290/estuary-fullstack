"use client"
import { useRef } from "react"
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import ServiceCard from "@/components/ui/service-card"

// Sample upcoming workshops data
const UPCOMING_WORKSHOPS = [
  {
    id: 1,
    title: "Mindful Presence Workshop",
    type: "workshops" as const,
    practitioner: {
      id: 1,
      name: "Dr. Sarah Johnson",
      image: "https://i.pravatar.cc/150?img=47",
    },
    date: "April 25",
    capacity: 5,
    location: "Virtual",
    price: 45,
    duration: 120,
    categories: ["Mindfulness", "Meditation"],
    description: "Learn to cultivate deep presence and awareness in this transformative workshop.",
    rating: 4.9,
    reviewCount: 87,
    image: "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=400&h=300&fit=crop",
  },
  {
    id: 2,
    title: "Sound Healing Journey",
    type: "workshops" as const,
    practitioner: {
      id: 2,
      name: "James Wilson",
      image: "https://i.pravatar.cc/150?img=12",
    },
    date: "April 30",
    capacity: 10,
    location: "In-person",
    price: 60,
    duration: 180,
    categories: ["Sound Healing", "Energy Work"],
    description: "Experience the healing power of sound frequencies and vibrations.",
    rating: 4.8,
    reviewCount: 65,
    image: "https://images.unsplash.com/photo-1593697820980-0254db11e436?w=400&h=300&fit=crop",
  },
  {
    id: 3,
    title: "Forest Bathing Retreat",
    type: "workshops" as const,
    practitioner: {
      id: 3,
      name: "Elena Rodriguez",
      image: "https://i.pravatar.cc/150?img=32",
    },
    date: "May 15",
    capacity: 8,
    location: "In-person",
    price: 95,
    duration: 240,
    categories: ["Nature", "Mindfulness"],
    description: "Immerse yourself in nature's healing embrace through forest bathing practices.",
    rating: 5.0,
    reviewCount: 42,
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?w=400&h=300&fit=crop",
  },
  {
    id: 4,
    title: "Breathwork Fundamentals",
    type: "workshops" as const,
    practitioner: {
      id: 4,
      name: "Michael Chen",
      image: "https://i.pravatar.cc/150?img=33",
    },
    date: "May 2",
    capacity: 12,
    location: "Virtual",
    price: 40,
    duration: 90,
    categories: ["Breathwork", "Wellness"],
    description: "Master the fundamentals of conscious breathing for stress relief and vitality.",
    rating: 4.7,
    reviewCount: 124,
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=300&fit=crop",
  },
  {
    id: 5,
    title: "Intuitive Movement",
    type: "workshops" as const,
    practitioner: {
      id: 5,
      name: "Aisha Patel",
      image: "https://i.pravatar.cc/150?img=44",
    },
    date: "May 8",
    capacity: 6,
    location: "In-person",
    price: 55,
    duration: 150,
    categories: ["Movement", "Dance"],
    description: "Explore the wisdom of your body through intuitive movement and expression.",
    rating: 4.9,
    reviewCount: 56,
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=300&fit=crop",
  },
]

export default function UpcomingWorkshopsSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: "smooth" })
    }
  }

  return (
    <section className="py-16 bg-gradient-to-b from-cream-50 to-sage-50/30 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-terracotta-200/30 blur-3xl top-[-100px] left-[-100px] z-0" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-sage-200/40 blur-3xl bottom-[50px] right-[10%] z-0" />

      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-olive-900">Upcoming Transformations</h2>
            <p className="text-olive-600 text-lg mt-2">Join our community for these transformative experiences</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollLeft}
              className="rounded-full border-sage-300 hover:bg-sage-100"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth="1.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollRight}
              className="rounded-full border-sage-300 hover:bg-sage-100"
            >
              <ChevronRight className="h-4 w-4" strokeWidth="1.5" />
            </Button>
            <Link href="/marketplace/workshops" className="ml-4">
              <Button variant="ghost" className="text-sage-700 hover:text-sage-800 hover:bg-sage-100">
                View All Workshops
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {UPCOMING_WORKSHOPS.map((workshop, index) => (
              <div key={workshop.id} className="min-w-[350px] max-w-[350px] flex">
                <ServiceCard
                  {...workshop}
                  href={`/workshops/${workshop.id}`}
                  index={index}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}