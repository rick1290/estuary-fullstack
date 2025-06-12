"use client"
import { useRef } from "react"
import Link from "next/link"
import { ArrowRight, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Sample upcoming workshops data
const UPCOMING_WORKSHOPS = [
  {
    id: 1,
    title: "Mindful Presence Workshop",
    practitioner: "Dr. Sarah Johnson",
    practitionerAvatar: "/practitioner-1.jpg",
    practitionerInitials: "SJ",
    date: "April 25",
    spots: 5,
    location: "Virtual",
    price: "$45",
  },
  {
    id: 2,
    title: "Sound Healing Journey",
    practitioner: "James Wilson",
    practitionerAvatar: "/practitioner-2.jpg",
    practitionerInitials: "JW",
    date: "April 30",
    spots: 10,
    location: "In-person",
    price: "$60",
  },
  {
    id: 3,
    title: "Forest Bathing Retreat",
    practitioner: "Elena Rodriguez",
    practitionerAvatar: "/practitioner-3.jpg",
    practitionerInitials: "ER",
    date: "May 15",
    spots: 8,
    location: "In-person",
    price: "$95",
  },
  {
    id: 4,
    title: "Breathwork Fundamentals",
    practitioner: "Michael Chen",
    practitionerAvatar: "/practitioner-4.jpg",
    practitionerInitials: "MC",
    date: "May 2",
    spots: 12,
    location: "Virtual",
    price: "$40",
  },
  {
    id: 5,
    title: "Intuitive Movement",
    practitioner: "Aisha Patel",
    practitionerAvatar: "/images/avatar-2.png",
    practitionerInitials: "AP",
    date: "May 8",
    spots: 6,
    location: "In-person",
    price: "$55",
  },
]

export default function UpcomingWorkshopsSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" })
    }
  }

  return (
    <section className="py-12 bg-[#F8F5F1]/50 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute w-[300px] h-[300px] rounded-full bg-[#E8D5C4]/30 blur-3xl top-[-100px] left-[-100px] z-0" />
      <div className="absolute w-[200px] h-[200px] rounded-full bg-[#E3EFE3]/40 blur-3xl bottom-[50px] right-[10%] z-0" />

      <div className="container relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#4A4036]">Upcoming Workshops</h2>
            <p className="text-[#4A4036]/70">Join our community for these transformative experiences</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollLeft}
              className="rounded-full text-[#4A4036] border-[#4A4036]/20"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Scroll left</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollRight}
              className="rounded-full text-[#4A4036] border-[#4A4036]/20"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Scroll right</span>
            </Button>
            <Button variant="ghost" asChild className="text-[#4A4036]">
              <Link href="/workshops" className="flex items-center">
                Explore All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {UPCOMING_WORKSHOPS.map((workshop) => (
            <Card
              key={workshop.id}
              className="min-w-[280px] max-w-[280px] flex-shrink-0 rounded-xl transition-all duration-300 hover:shadow-md snap-start border-[#4A4036]/10"
            >
              <CardContent className="p-4">
                <div className="mb-2">
                  <Badge variant="outline" className="bg-[#F8F5F1] text-[#4A4036] border-[#4A4036]/20">
                    Workshop
                  </Badge>
                </div>
                <h3 className="text-lg font-medium text-[#4A4036] truncate">{workshop.title}</h3>

                <div className="flex items-center mt-2 mb-3">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={workshop.practitionerAvatar || "/placeholder.svg"} alt={workshop.practitioner} />
                    <AvatarFallback className="text-xs bg-[#E8D5C4] text-[#4A4036]">
                      {workshop.practitionerInitials}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-[#4A4036]/80">{workshop.practitioner}</p>
                </div>

                <div className="flex items-center mb-1 mt-3">
                  <Calendar className="h-4 w-4 text-[#4A4036]/60 mr-1" />
                  <p className="text-sm text-[#4A4036]/70">
                    {workshop.date} • {workshop.location}
                  </p>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <Badge variant="outline" className="bg-[#E3EFE3] text-[#4A6D4A] border-[#4A6D4A]/20">
                    {workshop.spots} spots left
                  </Badge>
                  <p className="text-lg font-semibold text-[#4A6D4A]">{workshop.price}</p>
                </div>

                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="w-full border-[#4A4036] text-[#4A4036] hover:bg-[#4A4036] hover:text-white"
                    asChild
                  >
                    <Link href={`/workshops/${workshop.id}`}>Book Your Spot</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
