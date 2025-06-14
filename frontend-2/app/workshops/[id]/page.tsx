import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Clock, MapPin, Users, Star, Heart, Share2, Calendar, Check, Sparkles } from "lucide-react"
import WorkshopBookingPanel from "@/components/workshops/workshop-booking-panel"
import ServicePractitioner from "@/components/shared/service-practitioner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// Mock workshop data - in a real app, this would come from an API or database
const getWorkshopById = (id: string) => {
  const workshops = [
    {
      id: "1",
      title: "Mindfulness Meditation Retreat",
      description: "A weekend retreat to deepen your meditation practice and connect with like-minded individuals.",
      image: "/serene-meditation-space.png",
      startTime: "9:00 AM",
      endTime: "5:00 PM",
      duration: 480,
      location: "In-person",
      venue: "Serenity Retreat Center",
      address: "123 Peaceful Valley Rd, Boulder, CO",
      capacity: 20,
      spotsRemaining: 8,
      experienceLevel: "all-levels",
      price: 299,
      categories: ["Meditation", "Mindfulness", "Wellness"],
      practitioners: [
        {
          id: "p1",
          name: "Dr. Sarah Johnson",
          image: "/practitioner-1.jpg",
          title: "Meditation Instructor & Clinical Psychologist",
          bio: "Dr. Johnson has over 15 years of experience teaching mindfulness practices.",
        },
        {
          id: "p2",
          name: "Michael Chen",
          image: "/practitioner-2.jpg",
          title: "Yoga Instructor & Wellness Coach",
          bio: "Michael specializes in integrating movement with mindfulness practices.",
        },
      ],
      agenda: [
        {
          day: "Day 1",
          sessions: [
            {
              time: "9:00 AM - 10:30 AM",
              title: "Opening Circle & Introduction to Mindfulness",
              description: "Meet the group and learn foundational mindfulness concepts.",
            },
            {
              time: "11:00 AM - 12:30 PM",
              title: "Breath Awareness Practice",
              description: "Techniques to develop awareness of the breath as an anchor.",
            },
          ],
        },
        {
          day: "Day 2",
          sessions: [
            {
              time: "9:00 AM - 10:30 AM",
              title: "Body Scan Meditation",
              description: "Developing awareness of physical sensations throughout the body.",
            },
            {
              time: "11:00 AM - 12:30 PM",
              title: "Mindful Movement",
              description: "Gentle yoga and movement practices to integrate mind and body.",
            },
          ],
        },
      ],
      benefits: [
        {
          id: "1",
          title: "Reduced Stress",
          description: "Learn techniques to calm your nervous system and reduce daily stress.",
        },
        {
          id: "2",
          title: "Improved Focus",
          description: "Develop skills to enhance concentration and mental clarity.",
        },
        {
          id: "3",
          title: "Emotional Balance",
          description: "Cultivate greater emotional resilience and self-awareness.",
        },
        {
          id: "4",
          title: "Community Connection",
          description: "Connect with like-minded individuals on a similar journey.",
        },
      ],
      dates: [
        {
          id: 1,
          date: "June 15-17, 2025",
          startTime: "9:00 AM",
          endTime: "5:00 PM",
          spotsRemaining: 8,
        },
        {
          id: 2,
          date: "July 20-22, 2025",
          startTime: "9:00 AM",
          endTime: "5:00 PM",
          spotsRemaining: 12,
        },
        {
          id: 3,
          date: "August 10-12, 2025",
          startTime: "9:00 AM",
          endTime: "5:00 PM",
          spotsRemaining: 15,
        },
      ],
    },
    {
      id: "2",
      title: "Sound Healing Journey",
      description: "Experience the therapeutic power of sound vibrations for deep relaxation and inner harmony.",
      image: "/mindful-moments.png",
      startTime: "7:00 PM",
      endTime: "9:30 PM",
      duration: 150,
      location: "In-person",
      venue: "Harmony Wellness Center",
      address: "456 Tranquil Lane, Portland, OR",
      capacity: 30,
      spotsRemaining: 12,
      experienceLevel: "beginner-friendly",
      price: 85,
      categories: ["Sound Healing", "Relaxation", "Wellness"],
      practitioners: [
        {
          id: "p3",
          name: "Elena Rodriguez",
          image: "/practitioner-3.jpg",
          title: "Sound Therapist & Reiki Master",
          bio: "Elena has studied sound healing traditions from around the world for over a decade.",
        },
      ],
      agenda: [
        {
          day: "Evening Session",
          sessions: [
            {
              time: "7:00 PM - 7:30 PM",
              title: "Introduction to Sound Healing",
              description: "Learn about the science and traditions behind sound therapy.",
            },
            {
              time: "7:30 PM - 8:45 PM",
              title: "Immersive Sound Bath",
              description: "Experience a full sound journey with singing bowls, gongs, and other instruments.",
            },
          ],
        },
      ],
      benefits: [
        { id: "1", title: "Deep Relaxation", description: "Experience profound states of relaxation and peace." },
        {
          id: "2",
          title: "Stress Release",
          description: "Allow sound vibrations to release tension held in the body.",
        },
        {
          id: "3",
          title: "Improved Sleep",
          description: "Many participants report better sleep quality following sound therapy.",
        },
        { id: "4", title: "Emotional Clearing", description: "Sound can help process and release stored emotions." },
      ],
      dates: [
        {
          id: 1,
          date: "July 8, 2025",
          startTime: "7:00 PM",
          endTime: "9:30 PM",
          spotsRemaining: 12,
        },
        {
          id: 2,
          date: "July 22, 2025",
          startTime: "7:00 PM",
          endTime: "9:30 PM",
          spotsRemaining: 18,
        },
        {
          id: 3,
          date: "August 5, 2025",
          startTime: "7:00 PM",
          endTime: "9:30 PM",
          spotsRemaining: 20,
        },
      ],
    },
    {
      id: "3",
      title: "Conscious Leadership Workshop",
      description: "Develop authentic leadership skills grounded in mindfulness, emotional intelligence, and purpose.",
      image: "/confident-leader.png",
      startTime: "9:00 AM",
      endTime: "4:00 PM",
      duration: 420,
      location: "Hybrid (In-person & Online)",
      venue: "Innovation Leadership Center",
      address: "789 Visionary Ave, Austin, TX",
      capacity: 25,
      spotsRemaining: 15,
      experienceLevel: "intermediate",
      price: 450,
      categories: ["Leadership", "Professional Development", "Mindfulness"],
      practitioners: [
        {
          id: "p4",
          name: "James Wilson",
          image: "/practitioner-4.jpg",
          title: "Executive Coach & Organizational Psychologist",
          bio: "James has worked with leaders at Fortune 500 companies to develop mindful leadership practices.",
        },
        {
          id: "p1",
          name: "Dr. Sarah Johnson",
          image: "/practitioner-1.jpg",
          title: "Meditation Instructor & Clinical Psychologist",
          bio: "Dr. Johnson specializes in mindfulness applications for workplace wellbeing.",
        },
      ],
      agenda: [
        {
          day: "Day 1",
          sessions: [
            {
              time: "9:00 AM - 10:30 AM",
              title: "Foundations of Conscious Leadership",
              description: "Understanding the principles and research behind mindful leadership.",
            },
            {
              time: "11:00 AM - 12:30 PM",
              title: "Self-Awareness Practices",
              description: "Exercises to develop greater awareness of your leadership patterns.",
            },
          ],
        },
        {
          day: "Day 2",
          sessions: [
            {
              time: "9:00 AM - 10:30 AM",
              title: "Mindful Communication",
              description: "Techniques for more authentic and effective communication.",
            },
            {
              time: "11:00 AM - 12:30 PM",
              title: "Leading Through Uncertainty",
              description: "Practices for maintaining presence and clarity during challenging times.",
            },
          ],
        },
      ],
      benefits: [
        {
          id: "1",
          title: "Authentic Leadership",
          description: "Develop a leadership style aligned with your values and strengths.",
        },
        {
          id: "2",
          title: "Improved Team Dynamics",
          description: "Learn techniques to foster psychological safety and collaboration.",
        },
        {
          id: "3",
          title: "Stress Resilience",
          description: "Build practices to maintain balance during challenging leadership moments.",
        },
        {
          id: "4",
          title: "Strategic Clarity",
          description: "Develop the mental clarity needed for effective decision-making.",
        },
      ],
      dates: [
        {
          id: 1,
          date: "August 12-13, 2025",
          startTime: "9:00 AM",
          endTime: "4:00 PM",
          spotsRemaining: 15,
        },
        {
          id: 2,
          date: "September 9-10, 2025",
          startTime: "9:00 AM",
          endTime: "4:00 PM",
          spotsRemaining: 20,
        },
        {
          id: 3,
          date: "October 14-15, 2025",
          startTime: "9:00 AM",
          endTime: "4:00 PM",
          spotsRemaining: 25,
        },
      ],
    },
    // Adding workshop with ID "8"
    {
      id: "8",
      title: "Forest Bathing & Nature Connection",
      description:
        "Immerse yourself in the healing practice of forest bathing (shinrin-yoku) and deepen your connection with the natural world.",
      image: "/serene-forest-meditation.png",
      startTime: "10:00 AM",
      endTime: "2:00 PM",
      duration: 240,
      location: "In-person",
      venue: "Wildwood Nature Preserve",
      address: "567 Forest Path, Asheville, NC",
      capacity: 15,
      spotsRemaining: 9,
      experienceLevel: "all-levels",
      price: 125,
      categories: ["Nature", "Mindfulness", "Wellness", "Ecotherapy"],
      practitioners: [
        {
          id: "p5",
          name: "Maya Thompson",
          image: "/practitioner-3.jpg",
          title: "Certified Forest Therapy Guide & Ecotherapist",
          bio: "Maya has been guiding forest bathing experiences for over 8 years and is passionate about helping people reconnect with nature.",
        },
      ],
      agenda: [
        {
          day: "Half-Day Experience",
          sessions: [
            {
              time: "10:00 AM - 10:30 AM",
              title: "Welcome & Introduction to Forest Bathing",
              description:
                "Learn about the Japanese practice of shinrin-yoku and its scientifically proven health benefits.",
            },
            {
              time: "10:30 AM - 12:00 PM",
              title: "Guided Forest Immersion",
              description: "A slow, mindful walk through the forest with sensory invitation exercises.",
            },
            {
              time: "12:00 PM - 12:30 PM",
              title: "Tea Ceremony & Light Snack",
              description: "Enjoy forest-inspired tea and seasonal snacks in a beautiful setting.",
            },
            {
              time: "12:30 PM - 1:30 PM",
              title: "Solo Nature Connection Time",
              description: "Personal time to connect with a special spot in nature.",
            },
            {
              time: "1:30 PM - 2:00 PM",
              title: "Closing Circle & Integration",
              description: "Share experiences and discuss ways to bring nature connection into daily life.",
            },
          ],
        },
      ],
      benefits: [
        {
          id: "1",
          title: "Stress Reduction",
          description:
            "Forest environments have been scientifically proven to lower cortisol levels and blood pressure.",
        },
        {
          id: "2",
          title: "Immune System Support",
          description: "Exposure to phytoncides (compounds released by trees) can boost natural killer cell activity.",
        },
        {
          id: "3",
          title: "Mental Clarity",
          description: "Nature immersion helps reduce mental fatigue and restore attention.",
        },
        {
          id: "4",
          title: "Emotional Wellbeing",
          description: "Connect with nature to enhance mood and reduce anxiety.",
        },
        {
          id: "5",
          title: "Sensory Awakening",
          description: "Rediscover the joy of your senses through guided nature connection.",
        },
      ],
      dates: [
        {
          id: 1,
          date: "May 25, 2025",
          startTime: "10:00 AM",
          endTime: "2:00 PM",
          spotsRemaining: 9,
        },
        {
          id: 2,
          date: "June 22, 2025",
          startTime: "10:00 AM",
          endTime: "2:00 PM",
          spotsRemaining: 12,
        },
        {
          id: 3,
          date: "July 13, 2025",
          startTime: "10:00 AM",
          endTime: "2:00 PM",
          spotsRemaining: 15,
        },
        {
          id: 4,
          date: "August 17, 2025",
          startTime: "10:00 AM",
          endTime: "2:00 PM",
          spotsRemaining: 15,
        },
      ],
    },
  ]

  return workshops.find((workshop) => workshop.id === id)
}

export default function WorkshopPage({ params }: { params: { id: string } }) {
  const workshop = getWorkshopById(params.id)

  if (!workshop) {
    notFound()
  }

  // Transform the data to match our immersive design needs
  const transformedWorkshop = {
    ...workshop,
    longDescription: workshop.description + `\n\n` + (workshop.agenda?.length > 1 ? 
      `This immersive ${workshop.agenda.length}-day experience combines practical learning with deep personal transformation. You'll be guided through carefully crafted sessions designed to build upon each other, creating a comprehensive journey of discovery and growth.` : 
      `This intensive workshop experience combines practical learning with deep personal transformation. Through guided exercises and interactive discussions, you'll develop skills that will serve you long after the workshop ends.`),
    totalHours: Math.floor(workshop.duration / 60),
    whatYoullLearn: workshop.benefits.map((b: any) => `${b.title}: ${b.description}`),
    included: [
      "All workshop materials and handouts",
      "Guided practice resources",
      "Light refreshments and snacks",
      "Certificate of completion",
      "Post-workshop support resources"
    ],
    schedule: workshop.agenda
  }

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Immersive Hero Section */}
      <section className="relative min-h-[85vh] bg-gradient-to-b from-sage-50 via-terracotta-50 to-cream-50 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 texture-grain opacity-25" />
        <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-blush-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-40 -right-60 w-[700px] h-[700px] bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-terracotta-100/20 rounded-full blur-3xl" />
        
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
                  <Link href="/marketplace">Explore Wellness</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-olive-700 hover:text-olive-900">
                  <Link href="/marketplace/workshops">Workshops</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-olive-400" strokeWidth="1.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <span className="text-olive-900 font-medium">{workshop.title}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8 animate-slide-up">
              {/* Workshop Label */}
              <div className="inline-flex items-center gap-3 bg-sage-100 px-5 py-3 rounded-full">
                <Sparkles className="h-5 w-5 text-sage-600 animate-pulse" strokeWidth="1.5" />
                <span className="text-sage-800 font-medium">
                  {workshop.location === 'In-person' ? 'In-Person Experience' : workshop.location} • Limited Spots
                </span>
              </div>
              
              <div>
                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-olive-900 mb-6 leading-[1.1]">
                  {workshop.title}
                </h1>
                <p className="text-xl lg:text-2xl text-olive-700 leading-relaxed font-light">
                  {workshop.description}
                </p>
              </div>
              
              {/* Workshop Stats */}
              <div className="flex flex-wrap items-center gap-6 lg:gap-10">
                <div className="text-center lg:text-left">
                  <p className="text-4xl font-bold text-olive-900">{transformedWorkshop.totalHours}</p>
                  <p className="text-olive-600">Hours of Learning</p>
                </div>
                <div className="w-px h-12 bg-sage-300 hidden lg:block" />
                <div className="text-center lg:text-left">
                  <p className="text-4xl font-bold text-terracotta-600">{workshop.spotsRemaining}</p>
                  <p className="text-olive-600">Spots Remaining</p>
                </div>
                <div className="w-px h-12 bg-sage-300 hidden lg:block" />
                <div className="text-center lg:text-left">
                  <p className="text-4xl font-bold text-olive-900">{workshop.capacity}</p>
                  <p className="text-olive-600">Max Participants</p>
                </div>
              </div>
              
              {/* Key Details */}
              <div className="bg-cream-100 rounded-2xl p-6 space-y-3">
                {workshop.dates && workshop.dates[0] && (
                  <div className="flex items-center gap-3 text-olive-700">
                    <Calendar className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                    <span className="font-medium">Next Date: {workshop.dates[0].date}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-olive-700">
                  <Clock className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                  <span className="font-medium">{workshop.startTime} - {workshop.endTime}</span>
                </div>
                {workshop.venue && (
                  <div className="flex items-center gap-3 text-olive-700">
                    <MapPin className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                    <span className="font-medium">{workshop.venue}</span>
                  </div>
                )}
              </div>
              
              {/* CTA Section */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="shadow-xl hover:shadow-2xl px-8">
                    Reserve Your Spot - ${workshop.price}
                  </Button>
                  <Button size="lg" variant="outline" className="group">
                    <Heart className="h-5 w-5 mr-2 group-hover:text-rose-500 transition-colors" strokeWidth="1.5" />
                    Save Workshop
                  </Button>
                </div>
                <p className="text-sm text-olive-600">
                  ✓ Small group size • ✓ All materials included • ✓ 100% satisfaction guarantee
                </p>
              </div>
            </div>
            
            {/* Right: Visual Element */}
            <div className="relative animate-scale-in">
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-sage-100 to-blush-100 shadow-2xl">
                {workshop.image ? (
                  <img 
                    src={workshop.image} 
                    alt={workshop.title}
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-70"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-6">
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-sage-300 to-terracotta-300 mx-auto flex items-center justify-center">
                        <Sparkles className="h-16 w-16 text-white" strokeWidth="1" />
                      </div>
                      <p className="text-xl text-sage-700 font-medium">Transform Your Journey</p>
                    </div>
                  </div>
                )}
                
                {/* Floating elements */}
                <div className="absolute top-6 right-6 bg-terracotta-500 text-white px-4 py-2 rounded-full font-medium shadow-lg">
                  Only {workshop.spotsRemaining} spots left!
                </div>
                
                {/* Floating facilitator preview */}
                <div className="absolute bottom-6 left-6 right-6 bg-cream-50/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                  <p className="text-sm text-olive-600 mb-3">Your Lead Facilitator</p>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sage-300 to-terracotta-300 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {workshop.practitioners[0].name.split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-olive-900">{workshop.practitioners[0].name}</p>
                      <p className="text-sm text-olive-600">{workshop.practitioners[0].title}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-7xl py-20">
        {/* Quick Actions - Floating */}
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 opacity-0 lg:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-cream-50/80 backdrop-blur-sm shadow-lg hover:shadow-xl"
          >
            <Share2 className="h-4 w-4" strokeWidth="1.5" />
          </Button>
        </div>

        <div className="grid gap-16 lg:grid-cols-3">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-20">
            {/* Workshop Overview - Immersive */}
            <section className="animate-fade-in">
              <h2 className="text-3xl font-bold text-olive-900 mb-8">Your Transformation Awaits</h2>
              <div className="prose prose-lg prose-olive max-w-none">
                <p className="text-lg text-olive-700 leading-relaxed whitespace-pre-line">
                  {transformedWorkshop.longDescription}
                </p>
              </div>
            </section>

            {/* What You'll Master */}
            <section className="animate-fade-in" style={{animationDelay: '0.2s'}}>
              <h2 className="text-3xl font-bold text-olive-900 mb-10">What You'll Master</h2>
              <div className="grid gap-4">
                {transformedWorkshop.whatYoullLearn.map((item: string, index: number) => (
                  <div key={index} className="bg-gradient-to-r from-sage-50 to-terracotta-50 rounded-2xl p-6 card-hover">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
                          <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                        </div>
                      </div>
                      <p className="text-olive-700 leading-relaxed">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Workshop Schedule */}
            <section className="animate-fade-in" style={{animationDelay: '0.4s'}}>
              <h2 className="text-3xl font-bold text-olive-900 mb-10">Your Workshop Journey</h2>
              <div className="space-y-8">
                {transformedWorkshop.schedule.map((day: any, dayIndex: number) => (
                  <Card key={dayIndex} className="border-2 border-sage-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-terracotta-100 to-sage-100 p-6">
                      <h3 className="text-2xl font-semibold text-olive-900">{day.day}</h3>
                    </div>
                    <CardContent className="p-8 bg-cream-50">
                      <div className="space-y-4">
                        {day.sessions.map((session: any, index: number) => (
                          <div key={index} className="flex gap-6 items-start group">
                            <div className="flex-shrink-0">
                              <div className="w-24 text-center">
                                <p className="text-sm font-semibold text-sage-700">{session.time}</p>
                              </div>
                            </div>
                            <div className="flex-1 pb-4 border-b border-sage-100 last:border-0 last:pb-0 group-hover:border-sage-200 transition-colors">
                              <h4 className="text-olive-800 font-medium mb-1">{session.title}</h4>
                              <p className="text-olive-600 text-sm">{session.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* What's Included */}
            <section className="bg-gradient-to-br from-blush-50 to-sage-50 rounded-3xl p-10 -mx-4 animate-fade-in" style={{animationDelay: '0.6s'}}>
              <h2 className="text-3xl font-bold text-olive-900 mb-10">Everything You Need</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {transformedWorkshop.included.map((item: string, index: number) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-sage-400 to-terracotta-400" />
                      </div>
                    </div>
                    <p className="text-olive-700 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Workshop Facilitators */}
            {workshop.practitioners && workshop.practitioners.length > 0 && (
              <section className="animate-fade-in" style={{animationDelay: '0.8s'}}>
                <h2 className="text-3xl font-bold text-olive-900 mb-10">
                  Meet Your Expert {workshop.practitioners.length > 1 ? 'Facilitators' : 'Facilitator'}
                </h2>
                <div className="space-y-6">
                  {workshop.practitioners.map((practitioner: any) => (
                    <Card key={practitioner.id} className="border-2 border-sage-200 overflow-hidden group hover:border-sage-300 transition-all">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-56 h-56 bg-gradient-to-br from-terracotta-100 to-sage-100 flex items-center justify-center">
                            <div className="w-28 h-28 rounded-full bg-white shadow-xl flex items-center justify-center">
                              <span className="text-4xl font-bold text-olive-800">
                                {practitioner.name.split(' ').map((n: string) => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 p-8">
                            <h3 className="text-2xl font-semibold text-olive-900 mb-2">{practitioner.name}</h3>
                            <p className="text-lg text-sage-700 mb-4">{practitioner.title}</p>
                            <p className="text-olive-600 leading-relaxed">{practitioner.bio}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Success Stories */}
            <section className="animate-fade-in" style={{animationDelay: '1s'}}>
              <h2 className="text-3xl font-bold text-olive-900 mb-10">Transformative Experiences</h2>
              <div className="grid gap-6">
                <Card className="border-2 border-sage-100 bg-cream-100">
                  <CardContent className="p-8">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-6 w-6 text-terracotta-500 fill-terracotta-500" />
                      ))}
                    </div>
                    <blockquote className="text-xl text-olive-700 italic mb-6">
                      "This workshop completely shifted my perspective. The combination of expert guidance and supportive community created the perfect environment for growth."
                    </blockquote>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sage-300 to-blush-300 flex items-center justify-center">
                        <span className="text-white font-bold">MR</span>
                      </div>
                      <div>
                        <p className="font-semibold text-olive-900">Maria Rodriguez</p>
                        <p className="text-sm text-olive-600">Workshop Participant • Verified Review</p>
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
              <WorkshopBookingPanel workshop={workshop} dates={workshop.dates} />
              
              {/* Trust Indicators */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">Small group size (max {workshop.capacity})</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">All materials & resources included</span>
                </div>
                <div className="flex items-center gap-3 text-olive-600">
                  <Check className="h-5 w-5 text-sage-600 rounded-full" strokeWidth="1.5" />
                  <span className="text-sm">100% satisfaction guarantee</span>
                </div>
              </div>
              
              {/* Urgency Card */}
              <Card className="mt-6 border-2 border-terracotta-200 bg-terracotta-50">
                <CardContent className="p-6 text-center">
                  <Sparkles className="h-8 w-8 text-terracotta-600 mx-auto mb-3" strokeWidth="1.5" />
                  <h3 className="font-semibold text-olive-900 mb-2">Limited Availability</h3>
                  <p className="text-sm text-olive-700 mb-4">
                    Only <span className="font-bold text-terracotta-600">{workshop.spotsRemaining} spots</span> remaining for this transformative experience
                  </p>
                  <div className="flex justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-terracotta-400 animate-pulse" />
                    <p className="text-xs text-olive-600">3 people viewing now</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
