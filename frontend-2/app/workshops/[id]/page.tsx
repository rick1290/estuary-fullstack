import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Clock, MapPin, Users, Star, Heart, Share2, Calendar, CheckCircle } from "lucide-react"
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

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="container max-w-7xl pt-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="text-gray-600 hover:text-gray-900">
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="text-gray-600 hover:text-gray-900">
                <Link href="/marketplace">Marketplace</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="text-gray-600 hover:text-gray-900">
                <Link href="/marketplace/workshops">Workshops</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <span className="text-gray-900">{workshop.title}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl py-12">
        {/* Header Section */}
        <div className="max-w-4xl mb-12">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl font-medium text-gray-900 mb-4">{workshop.title}</h1>
              
              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{Math.floor(workshop.duration / 60)} hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{workshop.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{workshop.capacity} people max</span>
                </div>
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                  {workshop.spotsRemaining} spots left
                </Badge>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <Heart className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {workshop.categories.map((category) => (
              <Badge key={category} variant="secondary" className="px-3 py-1">
                {category}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-12">
            {/* Overview Section */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-4">Workshop Overview</h2>
              <p className="text-gray-600 leading-relaxed">{workshop.description}</p>
            </section>

            {/* Workshop Benefits */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-6">What You'll Gain</h2>
              <div className="grid gap-6">
                {workshop.benefits.map((benefit) => (
                  <div key={benefit.id} className="flex gap-4">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-1">{benefit.title}</h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Workshop Agenda */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-6">Workshop Agenda</h2>
              <div className="space-y-6">
                {workshop.agenda.map((day, index) => (
                  <div key={index}>
                    <h3 className="font-medium text-gray-900 mb-4">{day.day}</h3>
                    <div className="space-y-3">
                      {day.sessions.map((session, sessionIndex) => (
                        <Card key={sessionIndex} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{session.title}</h4>
                              <span className="text-sm text-gray-600">{session.time}</span>
                            </div>
                            <p className="text-sm text-gray-600">{session.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Workshop Details */}
            <section>
              <h2 className="text-xl font-medium text-gray-900 mb-6">Workshop Details</h2>
              <div className="grid gap-4 text-gray-600">
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Duration</span>
                  <span className="font-medium text-gray-900">{Math.floor(workshop.duration / 60)} hours</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Format</span>
                  <span className="font-medium text-gray-900">{workshop.location}</span>
                </div>
                {workshop.venue && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span>Venue</span>
                    <span className="font-medium text-gray-900">{workshop.venue}</span>
                  </div>
                )}
                {workshop.address && (
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span>Address</span>
                    <span className="font-medium text-gray-900 text-right">{workshop.address}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Experience Level</span>
                  <span className="font-medium text-gray-900">
                    {workshop.experienceLevel.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100">
                  <span>Group Size</span>
                  <span className="font-medium text-gray-900">Max {workshop.capacity} participants</span>
                </div>
              </div>
            </section>

            {/* Facilitators */}
            {workshop.practitioners && workshop.practitioners.length > 0 && (
              <section>
                <h2 className="text-xl font-medium text-gray-900 mb-6">
                  {workshop.practitioners.length > 1 ? "Workshop Facilitators" : "Workshop Facilitator"}
                </h2>
                <div className="grid gap-4">
                  {workshop.practitioners.map((practitioner) => (
                    <Card key={practitioner.id} className="border border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <Users className="h-8 w-8 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{practitioner.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{practitioner.title}</p>
                            <p className="text-sm text-gray-600">{practitioner.bio}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Booking Panel */}
          <div className="space-y-8">
            <div className="lg:sticky lg:top-8">
              <WorkshopBookingPanel workshop={workshop} dates={workshop.dates} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
