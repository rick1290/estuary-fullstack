import Link from "next/link"
import Image from "next/image"
import { ChevronRight, Clock, MapPin, User, Star, Heart, Share2, Calendar, Check } from "lucide-react"
import SessionBookingPanel from "@/components/sessions/session-booking-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Mock data for a session
const MOCK_SESSION = {
  id: 1,
  title: "Mindfulness Meditation Session",
  type: "one-on-one",
  description: "A personalized meditation session focused on mindfulness techniques for stress reduction.",
  longDescription: `This one-on-one mindfulness meditation session is designed to help you develop greater awareness, focus, and emotional regulation through guided meditation practices.

The session is tailored to your specific needs and experience level, whether you're completely new to meditation or looking to deepen your existing practice. We'll explore various mindfulness techniques that you can incorporate into your daily life to reduce stress and enhance overall wellbeing.

Each session includes personalized guidance, feedback on your technique, and recommendations for continuing your practice between sessions.`,
  price: 85,
  duration: 60,
  location: "Virtual",
  platform: "Zoom",
  rating: 4.9,
  reviewCount: 124,
  categories: ["Meditation", "Mindfulness"],
  image: "/session-image-1.jpg",
  experienceLevel: "all_levels",
  whatToExpect: [
    "Initial assessment of your current stress levels and meditation experience",
    "Guided mindfulness meditation practice tailored to your needs",
    "Instruction on proper breathing techniques and posture",
    "Discussion of how to integrate mindfulness into daily activities",
    "Personalized recommendations for home practice",
  ],
  benefits: [
    {
      id: 1,
      title: "Stress Reduction",
      description: "Learn techniques to reduce stress and anxiety in your daily life.",
      icon: "spa",
    },
    {
      id: 2,
      title: "Improved Focus",
      description: "Develop greater concentration and attention through regular practice.",
      icon: "center_focus_strong",
    },
    {
      id: 3,
      title: "Emotional Balance",
      description: "Cultivate emotional awareness and regulation skills.",
      icon: "balance",
    },
  ],
  availableSlots: [
    {
      id: 101,
      date: "2023-05-10",
      startTime: "09:00",
      endTime: "10:00",
      available: true,
    },
    {
      id: 102,
      date: "2023-05-10",
      startTime: "14:00",
      endTime: "15:00",
      available: true,
    },
    {
      id: 103,
      date: "2023-05-11",
      startTime: "11:00",
      endTime: "12:00",
      available: true,
    },
    {
      id: 104,
      date: "2023-05-12",
      startTime: "16:00",
      endTime: "17:00",
      available: true,
    },
    {
      id: 105,
      date: "2023-05-13",
      startTime: "10:00",
      endTime: "11:00",
      available: false,
    },
  ],
  practitioner: {
    id: 1,
    name: "Dr. Sarah Johnson",
    title: "Meditation Instructor & Mindfulness Coach",
    bio: "Dr. Sarah Johnson has over 15 years of experience teaching mindfulness meditation. She holds a Ph.D. in Psychology and is certified in Mindfulness-Based Stress Reduction (MBSR).",
    image: "/placeholder.svg?height=200&width=200",
    rating: 4.8,
    reviewCount: 56,
  },
}

export default function SessionDetailsPage({ params }: { params: { id: string } }) {
  // In a real application, you would fetch the session data based on the ID
  const session = MOCK_SESSION

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Immersive Hero Section */}
      <section className="relative min-h-[70vh] bg-gradient-to-b from-sage-50 via-cream-100 to-cream-50 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 texture-grain opacity-30" />
        
        {/* Decorative blob shapes */}
        <div className="absolute top-20 -right-40 w-96 h-96 bg-terracotta-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-40 w-96 h-96 bg-sage-200/20 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative container max-w-7xl py-12">
          {/* Breadcrumb */}
          <Breadcrumb className="mb-12 animate-fade-in">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/marketplace">Find Your Guide</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/marketplace/sessions">Sessions</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-olive-900 font-medium">{session.title}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8 animate-slide-up">
              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {session.categories.map((category) => (
                  <Badge key={category} variant="terracotta" className="text-sm">
                    {category}
                  </Badge>
                ))}
              </div>
              
              <div>
                <h1 className="text-5xl lg:text-6xl font-medium text-olive-900 mb-6 leading-tight">
                  {session.title}
                </h1>
                <p className="text-xl text-olive-700 leading-relaxed">
                  {session.description}
                </p>
              </div>
              
              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-6 text-olive-700">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                  <span className="font-medium">{session.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                  <span className="font-medium">{session.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                  <span className="font-medium">1-on-1 Session</span>
                </div>
              </div>
              
              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="h-6 w-6 text-terracotta-500 fill-terracotta-500" />
                  <span className="text-2xl font-medium text-olive-900">{session.rating}</span>
                </div>
                <span className="text-olive-600">({session.reviewCount} reviews)</span>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="shadow-lg">
                  Book Your Session
                </Button>
                <Button size="lg" variant="ghost" className="group">
                  <Heart className="h-5 w-5 mr-2 group-hover:text-rose-500 transition-colors" strokeWidth="1.5" />
                  Save for Later
                </Button>
              </div>
            </div>
            
            {/* Right: Visual Element */}
            <div className="relative animate-scale-in">
              <div className="relative h-[500px] rounded-3xl overflow-hidden bg-gradient-to-br from-sage-100 to-terracotta-100 shadow-2xl">
                {session.image ? (
                  <img 
                    src={session.image} 
                    alt={session.title}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-80"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Calendar className="h-32 w-32 text-sage-300" strokeWidth="1" />
                  </div>
                )}
                
                {/* Floating elements */}
                <div className="absolute top-6 right-6 bg-cream-50/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                  <p className="text-sm text-olive-700 mb-1">Starting from</p>
                  <p className="text-3xl font-medium text-olive-900">${session.price}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-7xl py-20">
        {/* Quick Share Actions - Floating */}
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 opacity-0 lg:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-cream-50/80 backdrop-blur-sm shadow-lg hover:shadow-xl"
          >
            <Share2 className="h-4 w-4" strokeWidth="1.5" />
          </Button>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          {/* Main Content - Left Side */}
          <div className="space-y-20">
            {/* Immersive Overview Section */}
            <section className="animate-fade-in">
              <div className="relative">
                <h2 className="text-3xl font-medium text-olive-900 mb-8">Your Journey Begins Here</h2>
                <div className="prose prose-lg prose-olive max-w-none">
                  <p className="text-olive-700 leading-relaxed text-lg whitespace-pre-line">
                    {session.longDescription}
                  </p>
                </div>
              </div>
            </section>

            {/* Visual What to Expect Section */}
            <section className="animate-fade-in" style={{animationDelay: '0.2s'}}>
              <h2 className="text-3xl font-medium text-olive-900 mb-10">What Your Session Includes</h2>
              <div className="grid gap-6">
                {session.whatToExpect.map((item, index) => (
                  <div key={index} className="group relative bg-cream-100 rounded-2xl p-6 hover:bg-sage-50 transition-all duration-300 card-hover">
                    <div className="flex gap-5">
                      <div className="flex-shrink-0 w-12 h-12 bg-sage-200 rounded-full flex items-center justify-center text-sage-700 font-medium">
                        {index + 1}
                      </div>
                      <p className="text-olive-700 text-lg leading-relaxed pt-2">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Transformative Benefits */}
            <section className="animate-fade-in" style={{animationDelay: '0.4s'}}>
              <h2 className="text-3xl font-medium text-olive-900 mb-10">Transform Your Practice</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {session.benefits.map((benefit) => (
                  <div key={benefit.id} className="relative group">
                    <div className="absolute -left-4 top-0 w-1 h-full bg-terracotta-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="pl-4">
                      <h3 className="text-xl font-medium text-olive-900 mb-3 group-hover:text-sage-700 transition-colors">
                        {benefit.title}
                      </h3>
                      <p className="text-olive-600 leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Practitioner Spotlight */}
            <section className="bg-gradient-to-br from-sage-50 to-cream-100 rounded-3xl p-10 -mx-4 animate-fade-in" style={{animationDelay: '0.6s'}}>
              <h2 className="text-3xl font-medium text-olive-900 mb-8">Meet Your Guide</h2>
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex items-center justify-center shadow-xl">
                    <span className="text-4xl font-medium text-olive-800">
                      {session.practitioner.name.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-medium text-olive-900 mb-2">{session.practitioner.name}</h3>
                  <p className="text-lg text-sage-700 mb-4">{session.practitioner.title}</p>
                  <p className="text-olive-600 leading-relaxed mb-4">{session.practitioner.bio}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 text-terracotta-500 fill-terracotta-500" />
                      <span className="font-medium text-olive-900">{session.practitioner.rating}</span>
                    </div>
                    <span className="text-olive-600">• {session.practitioner.reviewCount} sessions completed</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Session Details Card */}
            <section className="animate-fade-in" style={{animationDelay: '0.8s'}}>
              <Card className="border-2 border-sage-200 bg-cream-100/50 overflow-hidden">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-medium text-olive-900 mb-6">Session Details</h2>
                  <div className="grid gap-5">
                    <div className="flex justify-between items-center py-4 border-b border-sage-200">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                        <span className="text-olive-700">Duration</span>
                      </div>
                      <span className="font-medium text-olive-900">{session.duration} minutes</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-sage-200">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                        <span className="text-olive-700">Format</span>
                      </div>
                      <span className="font-medium text-olive-900">One-on-one</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-sage-200">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                        <span className="text-olive-700">Location</span>
                      </div>
                      <span className="font-medium text-olive-900">{session.location}</span>
                    </div>
                    {session.platform && (
                      <div className="flex justify-between items-center py-4 border-b border-sage-200">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                          <span className="text-olive-700">Platform</span>
                        </div>
                        <span className="font-medium text-olive-900">{session.platform}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-4">
                      <div className="flex items-center gap-3">
                        <Star className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                        <span className="text-olive-700">Experience Level</span>
                      </div>
                      <span className="font-medium text-olive-900">All Levels Welcome</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Testimonials Section */}
            <section className="animate-fade-in" style={{animationDelay: '1s'}}>
              <h2 className="text-3xl font-medium text-olive-900 mb-10">What Others Are Saying</h2>
              <div className="grid gap-6">
                <Card className="border-2 border-sage-100 bg-cream-50">
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-terracotta-500 fill-terracotta-500" />
                      ))}
                    </div>
                    <p className="text-lg text-olive-700 mb-6 italic">
                      "This session completely transformed my approach to meditation. Sarah's guidance was exactly what I needed to break through my mental barriers."
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-sage-200 flex items-center justify-center">
                        <span className="text-sage-700 font-medium">JM</span>
                      </div>
                      <div>
                        <p className="font-medium text-olive-900">Jessica M.</p>
                        <p className="text-sm text-olive-600">Verified Client</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-sage-100 bg-cream-50">
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-terracotta-500 fill-terracotta-500" />
                      ))}
                    </div>
                    <p className="text-lg text-olive-700 mb-6 italic">
                      "I've tried many meditation practices, but this personalized approach made all the difference. Highly recommend!"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-terracotta-200 flex items-center justify-center">
                        <span className="text-terracotta-700 font-medium">RT</span>
                      </div>
                      <div>
                        <p className="font-medium text-olive-900">Robert T.</p>
                        <p className="text-sm text-olive-600">Verified Client</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>

          {/* Right Column - Sticky Booking Panel */}
          <div className="space-y-8">
            <div className="lg:sticky lg:top-24">
              <SessionBookingPanel session={session} />
              
              {/* Trust Indicators */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">Free cancellation up to 24 hours before</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">100% secure checkout</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">Satisfaction guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}