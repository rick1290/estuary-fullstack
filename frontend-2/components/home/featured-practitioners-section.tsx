"use client"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// Sample featured practitioners
const FEATURED_PRACTITIONERS = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    specialty: "Mindfulness Coach",
    image: "/practitioner-1.jpg",
    rating: 4.9,
    reviews: 124,
  },
  {
    id: 2,
    name: "Michael Chen",
    specialty: "Nutritional Therapist",
    image: "/practitioner-2.jpg",
    rating: 4.8,
    reviews: 98,
  },
  {
    id: 3,
    name: "Aisha Patel",
    specialty: "Life Coach",
    image: "/practitioner-3.jpg",
    rating: 5.0,
    reviews: 87,
  },
  {
    id: 4,
    name: "James Wilson",
    specialty: "Sound Healer",
    image: "/practitioner-4.jpg",
    rating: 4.7,
    reviews: 65,
  },
]

export default function FeaturedPractitionersSection() {
  return (
    <section className="py-12 bg-white relative overflow-hidden">
      {/* Decorative SVG pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#785743" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#smallGrid)" />
        </svg>
      </div>

      <div className="container relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#4A4036]">Featured Practitioners</h2>
            <p className="text-[#4A4036]/70">Guides on your journey to wellness and growth</p>
          </div>
          <Button variant="ghost" asChild className="text-[#4A4036]">
            <Link href="/practitioners" className="flex items-center">
              View All Practitioners
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURED_PRACTITIONERS.map((practitioner) => (
            <Card
              key={practitioner.id}
              className="overflow-hidden transition-all duration-300 hover:shadow-md border-[#4A4036]/10"
            >
              <div className="relative h-48 w-full">
                <Image
                  src={practitioner.image || "/placeholder.svg"}
                  alt={practitioner.name}
                  fill
                  className="object-cover"
                />
              </div>
              <CardContent className="p-4 text-center">
                <h3 className="text-lg font-medium text-[#4A4036]">{practitioner.name}</h3>
                <p className="text-[#4A4036]/70 text-sm mb-2">{practitioner.specialty}</p>
                <div className="flex items-center justify-center gap-1 text-sm text-[#4A4036]/70">
                  <span className="text-amber-500">★</span>
                  <span>{practitioner.rating}</span>
                  <span>•</span>
                  <span>{practitioner.reviews} reviews</span>
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full rounded-full" asChild>
                  <Link href={`/practitioners/${practitioner.id}`}>View Profile</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
