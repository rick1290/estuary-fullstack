"use client"
import Link from "next/link"
import { ArrowRight, Star, MapPin, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuery } from "@tanstack/react-query"
import { practitionersListOptions } from "@/src/client/@tanstack/react-query.gen"

// Fallback mock data for development
const MOCK_PRACTITIONERS = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    specialty: "Mindfulness Coach",
    location: "New York, NY",
    image: "https://i.pravatar.cc/150?img=47",
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
    image: "https://i.pravatar.cc/150?img=33",
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
    image: "https://i.pravatar.cc/150?img=44",
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
    image: "https://i.pravatar.cc/150?img=12",
    rating: 4.7,
    reviews: 65,
    modalities: ["Sound Therapy", "Reiki", "Energy Work"],
    nextAvailable: "Available",
  },
]

export default function FeaturedPractitionersSection() {
  // Fetch featured practitioners from API
  const { data: practitionersData, isLoading, error } = useQuery({
    ...practitionersListOptions({
      query: {
        featured: true,
        limit: 4,
        ordering: '-is_featured,-average_rating'
      }
    }),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  })

  // Extract practitioners array and handle both paginated and direct responses
  const apiPractitioners = Array.isArray(practitionersData) ? practitionersData : 
                          (practitionersData?.results && Array.isArray(practitionersData.results)) ? practitionersData.results : []

  // Transform API data to component format
  const transformedPractitioners = apiPractitioners.map(practitioner => ({
    id: practitioner.public_uuid || practitioner.id,
    name: practitioner.display_name || practitioner.full_name || 'Practitioner',
    specialty: practitioner.primary_specialty || practitioner.title || 'Wellness Practitioner',
    location: practitioner.location || 'Location TBD',
    image: practitioner.profile_image_url || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
    rating: practitioner.average_rating || 4.8,
    reviews: practitioner.total_reviews || 0,
    modalities: practitioner.modalities?.map(m => m.name) || practitioner.primary_services?.slice(0,3).map(s => s.name) || ['Wellness'],
    nextAvailable: 'Available',
  }))

  // Use API data if available, otherwise fallback to mock data
  const featuredPractitioners = transformedPractitioners.length > 0 ? transformedPractitioners : MOCK_PRACTITIONERS

  return (
    <section className="py-20 bg-gradient-to-b from-white via-sage-50/30 to-cream-50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 texture-grain opacity-10" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sage-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-terracotta-200/20 rounded-full blur-3xl" />

      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
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

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg p-8 pb-4 text-center">
                <Skeleton className="w-24 h-24 mx-auto rounded-full mb-4" />
                <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
                <Skeleton className="h-4 w-1/2 mx-auto mb-3" />
                <Skeleton className="h-4 w-2/3 mx-auto mb-4" />
                <div className="flex justify-center gap-2 mb-6">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-8 w-full rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert className="border-red-200 bg-red-50 max-w-md mx-auto">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Unable to load featured practitioners. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {featuredPractitioners.map((practitioner, index) => (
              <div
                key={practitioner.id}
                className="animate-slide-up flex"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <Link
                  href={`/practitioners/${practitioner.id}`}
                  className="group block w-full transform transition-all duration-300 hover:scale-105"
                >
                  <Card className="h-full flex flex-col overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl bg-white">
                    {/* Avatar section */}
                    <div className="p-8 pb-4 text-center flex-grow flex flex-col">
                      <div className="w-24 h-24 mx-auto rounded-full overflow-hidden shadow-lg mb-4 border-4 border-white ring-2 ring-sage-200">
                        <img 
                          src={practitioner.image} 
                          alt={practitioner.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-olive-900 mb-1">{practitioner.name}</h3>
                      <p className="text-olive-600 text-sm mb-3">{practitioner.specialty}</p>
                      
                      <div className="flex items-center justify-center gap-1 text-sm text-olive-600 mb-4">
                        <Star className="h-4 w-4 text-terracotta-500 fill-terracotta-500" />
                        <span className="font-medium">{practitioner.rating}</span>
                        <span className="text-olive-400">•</span>
                        <span>{practitioner.location}</span>
                      </div>
                      
                      <div className="flex flex-wrap justify-center gap-2 mt-auto">
                        {practitioner.modalities.slice(0, 2).map((modality) => (
                          <span 
                            key={modality} 
                            className="text-xs px-3 py-1.5 bg-sage-100 text-olive-700 rounded-full"
                          >
                            {modality}
                          </span>
                        ))}
                        {practitioner.modalities.length > 2 && (
                          <span className="text-xs text-olive-600 self-center">+{practitioner.modalities.length - 2}</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom section */}
                    <div className="px-8 pb-8">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-sage-300 text-sage-700 hover:bg-sage-50 hover:border-sage-400"
                      >
                        View Profile
                      </Button>
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}