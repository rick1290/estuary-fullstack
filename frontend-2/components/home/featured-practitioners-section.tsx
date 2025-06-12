"use client"
import Link from "next/link"
import { ArrowRight, Star, MapPin, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Sample featured practitioners
const FEATURED_PRACTITIONERS = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    specialty: "Mindfulness Coach",
    location: "New York, NY",
    image: "/practitioner-1.jpg",
    rating: 4.9,
    reviews: 124,
    modalities: ["Meditation", "MBSR", "Breathwork"],
    nextAvailable: "Today",
  },
  {
    id: 2,
    name: "Michael Chen",
    specialty: "Nutritional Therapist",
    location: "Los Angeles, CA",
    image: "/practitioner-2.jpg",
    rating: 4.8,
    reviews: 98,
    modalities: ["Nutrition", "Holistic Health", "Detox"],
    nextAvailable: "Tomorrow",
  },
  {
    id: 3,
    name: "Aisha Patel",
    specialty: "Life Coach",
    location: "Virtual",
    image: "/practitioner-3.jpg",
    rating: 5.0,
    reviews: 87,
    modalities: ["Life Coaching", "NLP", "Goal Setting"],
    nextAvailable: "This Week",
  },
  {
    id: 4,
    name: "James Wilson",
    specialty: "Sound Healer",
    location: "Chicago, IL",
    image: "/practitioner-4.jpg",
    rating: 4.7,
    reviews: 65,
    modalities: ["Sound Therapy", "Reiki", "Energy Work"],
    nextAvailable: "Available",
  },
]

export default function FeaturedPractitionersSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-white via-sage-50/30 to-cream-50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 texture-grain opacity-10" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sage-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-terracotta-200/20 rounded-full blur-3xl" />

      <div className="container relative z-10">
        <div className="flex justify-between items-center mb-12">
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-terracotta-600" strokeWidth="1.5" />
              <p className="text-sm text-olive-600 font-medium uppercase tracking-wide">Meet Your Guides</p>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-olive-900">Featured Practitioners</h2>
            <p className="text-olive-600 text-lg mt-2">Expert guides ready to support your transformation</p>
          </div>
          <Button variant="ghost" asChild className="text-sage-700 hover:text-sage-800 hover:bg-sage-100 animate-fade-in">
            <Link href="/marketplace/practitioners" className="flex items-center">
              Explore All Guides
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
            </Link>
          </Button>
        </div>

        {/* Organic, uneven grid layout inspired by Octave */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8 max-w-6xl mx-auto">
          {FEATURED_PRACTITIONERS.map((practitioner, index) => {
            // Create intentional vertical offsets for stepping stone effect
            const offsetClasses = [
              "mt-0",      // First card - baseline
              "mt-8",      // Second card - pushed down
              "mt-4",      // Third card - slight offset
              "mt-12"      // Fourth card - more dramatic offset
            ]
            
            const rotateClasses = [
              "hover:rotate-1",         // Gentle rotation on hover
              "hover:-rotate-1", 
              "hover:rotate-2",
              "hover:-rotate-0.5"
            ]

            return (
              <div
                key={practitioner.id}
                className={`${offsetClasses[index]} animate-slide-up`}
                style={{animationDelay: `${index * 0.15}s`}}
              >
                <Link
                  href={`/practitioners/practitioner-${practitioner.id}`}
                  className={`group block transform transition-all duration-500 hover:scale-105 ${rotateClasses[index]}`}
                >
                  <Card className="overflow-visible border-0 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-[28px] bg-white relative">
                    {/* Minimalist top accent strip */}
                    <div className="h-3 bg-gradient-to-r from-sage-200 via-terracotta-200 to-blush-200 rounded-t-[28px]" />

                    {/* Main content area with avatar */}
                    <CardContent className="p-8 text-center bg-white rounded-b-[28px] relative">
                      {/* Floating avatar that breaks the top boundary */}
                      <div className="relative -mt-12 mb-6">
                        <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-sage-100 to-terracotta-100 p-1 shadow-xl">
                          <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-inner">
                            <span className="text-2xl font-medium text-olive-800">
                              {practitioner.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        
                        {/* Available badge floating beside avatar */}
                        <div className="absolute -top-1 -right-6 bg-sage-600 text-white px-2.5 py-1 rounded-full shadow-lg text-xs font-medium transform rotate-12 hover:rotate-6 transition-transform">
                          {practitioner.nextAvailable}
                        </div>
                      </div>

                      {/* Rating badge in top corner */}
                      <div className="absolute top-6 right-6 bg-cream-100 px-3 py-1.5 rounded-2xl shadow-md transform -rotate-2 hover:rotate-0 transition-transform">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-terracotta-500 fill-terracotta-500" />
                          <span className="text-sm font-semibold text-olive-800">{practitioner.rating}</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-semibold text-olive-900 mb-2">{practitioner.name}</h3>
                      <p className="text-olive-600 mb-4 font-medium">{practitioner.specialty}</p>
                      
                      <div className="flex items-center justify-center gap-2 text-sm text-olive-600 mb-6">
                        <MapPin className="h-4 w-4" strokeWidth="1.5" />
                        <span>{practitioner.location}</span>
                      </div>

                      {/* Organically positioned modality tags */}
                      <div className="flex flex-wrap justify-center gap-2 mb-8">
                        {practitioner.modalities.slice(0, 2).map((modality, idx) => (
                          <span 
                            key={modality} 
                            className={`text-xs px-3 py-2 bg-sage-100/70 text-olive-700 rounded-full border border-sage-200 transform transition-all hover:scale-110 hover:bg-sage-100 ${
                              idx % 2 ? 'rotate-1 hover:rotate-0' : '-rotate-1 hover:rotate-0'
                            }`}
                          >
                            {modality}
                          </span>
                        ))}
                        {practitioner.modalities.length > 2 && (
                          <span className="text-xs text-olive-600 self-center opacity-75">+{practitioner.modalities.length - 2}</span>
                        )}
                      </div>

                      {/* Quote or specialty highlight */}
                      <div className="bg-gradient-to-r from-sage-50 to-terracotta-50 rounded-2xl p-4 mb-6 transform -rotate-1 hover:rotate-0 transition-transform">
                        <p className="text-sm text-olive-700 italic">
                          "Guiding you toward deeper self-awareness and lasting well-being"
                        </p>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-sage-700 hover:text-sage-800 hover:bg-sage-50 rounded-[20px] group border border-sage-200 hover:border-sage-300 py-3 font-medium hover:shadow-md transition-all"
                      >
                        <span>Connect with {practitioner.name.split(' ')[0]}</span>
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" strokeWidth="1.5" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}