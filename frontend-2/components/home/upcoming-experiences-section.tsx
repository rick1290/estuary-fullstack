"use client"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getServiceDetailUrl } from "@/lib/service-utils"

// Upcoming experiences
const UPCOMING_EXPERIENCES = [
  {
    id: 1,
    slug: "mindful-presence-workshop",
    title: "Mindful Presence Workshop",
    practitioner: "Dr. Sarah Johnson",
    image: "/serene-meditation.png",
    date: "April 25",
    spots: 5,
    location: "Virtual",
    price: "$45",
    type: "Workshop",
  },
  {
    id: 2,
    slug: "holistic-nutrition-foundations",
    title: "Holistic Nutrition Foundations",
    practitioner: "Michael Chen",
    image: "/diverse-medical-team.png",
    date: "April 27",
    spots: 8,
    location: "Virtual",
    price: "$120",
    type: "Course",
  },
  {
    id: 3,
    slug: "transformative-life-coaching",
    title: "Transformative Life Coaching",
    practitioner: "Aisha Patel",
    image: "/confident-professional.png",
    date: "April 26",
    spots: 3,
    location: "Virtual",
    price: "$85",
    type: "Session",
  },
  {
    id: 4,
    slug: "healing-sound-journey",
    title: "Healing Sound Journey",
    practitioner: "James Wilson",
    image: "/mindful-moments.png",
    date: "April 30",
    spots: 10,
    location: "In-person",
    price: "$60",
    type: "Workshop",
  },
]

export default function UpcomingExperiencesSection() {
  return (
    <section className="py-20 md:py-24 bg-muted/20 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-green-500/5 blur-3xl top-[10%] right-[-200px] z-0" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-orange-500/5 blur-3xl bottom-[5%] left-[-100px] z-0" />

      <div className="container relative z-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Experiences to Nurture Your Growth</h2>
          <div className="h-1 w-20 bg-primary/80 mx-auto rounded-full mb-4"></div>
          <p className="text-muted-foreground max-w-[700px] mx-auto">
            Discover transformative sessions, courses, and workshops designed to support your unique path to wellness
            and personal development.
          </p>
        </div>

        <div className="relative mt-8">
          {/* Featured Experience (Larger Card) - Now using relative positioning */}
          <div className="mb-24 w-full md:w-[80%] mx-auto hidden md:block">
            <Card className="rounded-xl overflow-hidden shadow-md transition-transform duration-300 hover:translate-y-[-8px] hover:shadow-lg">
              <div className="relative h-[240px]">
                <Image
                  src="/serene-forest-meditation.png"
                  alt="Featured Experience"
                  fill
                  style={{ objectFit: "cover" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <Badge className="absolute top-4 right-4 bg-orange-500 hover:bg-orange-600">Featured</Badge>
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-semibold">Forest Bathing Retreat</h3>
                  <p className="text-sm">with Elena Rodriguez</p>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8">
                    <p className="mb-4 text-muted-foreground">
                      Immerse yourself in the healing power of nature with this guided forest bathing experience.
                      Reconnect with your senses and find deep restoration.
                    </p>
                    <div className="flex items-center mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                      <p className="text-sm text-muted-foreground">May 15 • In-person • 3 hours</p>
                    </div>
                  </div>
                  <div className="col-span-4 flex flex-col justify-between">
                    <div className="flex justify-end">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        8 spots left
                      </Badge>
                    </div>
                    <div className="flex flex-col items-end mt-2">
                      <p className="text-xl font-semibold text-green-700">$95</p>
                      <Button className="mt-2 rounded-full" asChild>
                        <Link href="/marketplace/workshops/featured">Learn More</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Regular Experience Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {UPCOMING_EXPERIENCES.map((experience) => (
              <Card
                key={experience.id}
                className="h-full flex flex-col rounded-xl overflow-hidden transition-all duration-300 hover:translate-y-[-8px] hover:shadow-md"
              >
                <div className="relative h-[160px]">
                  <Image
                    src={experience.image || "/placeholder.svg"}
                    alt={experience.title}
                    fill
                    className="object-cover"
                  />
                  <Badge className="absolute top-3 right-3 bg-background/90 text-foreground hover:bg-background/80">
                    {experience.type}
                  </Badge>
                </div>
                <CardContent className="flex-grow flex flex-col p-4">
                  <div className="flex-grow">
                    <div className="min-h-[3rem] mb-2">
                      <h3 className="text-lg font-medium leading-snug">{experience.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">with {experience.practitioner}</p>

                    <div className="flex items-center mb-1 mt-3">
                      <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                      <p className="text-sm text-muted-foreground">Starts {experience.date}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {experience.spots} spots left
                    </Badge>
                    <p className="text-lg font-semibold text-green-700">{experience.price}</p>
                  </div>
                </CardContent>
                <div className="p-3 pt-0">
                  <Button variant="outline" className="w-full rounded-full" asChild>
                    <Link href={getServiceDetailUrl({ id: experience.id, slug: experience.slug, service_type_code: experience.type.toLowerCase() })}>Learn More</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button className="rounded-full" asChild>
              <Link href="/marketplace">
                Discover All Experiences
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
