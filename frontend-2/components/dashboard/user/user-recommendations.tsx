"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Heart, Clock, MapPin, Star } from "lucide-react"

// Mock data for recommended services
const recommendedServices = [
  {
    id: 1,
    name: "Advanced Meditation Techniques",
    practitioner: "Dr. Sarah Johnson",
    duration: "75 min",
    price: "$85",
    type: "Virtual",
    image: "/session-image-1.jpg",
    isFavorite: false,
  },
  {
    id: 2,
    name: "Holistic Wellness Workshop",
    practitioner: "Michael Chen",
    duration: "120 min",
    price: "$150",
    type: "In-person",
    image: "/workshop-image-2.jpg",
    isFavorite: false,
  },
  {
    id: 3,
    name: "Mindful Movement Course",
    practitioner: "Emma Wilson",
    duration: "60 min",
    price: "$70",
    type: "Virtual",
    image: "/course-image-2.jpg",
    isFavorite: true,
  },
  {
    id: 4,
    name: "Nutritional Wellness Package",
    practitioner: "Dr. Robert Smith",
    duration: "45 min",
    price: "$95",
    type: "Virtual",
    image: "/package-image-1.jpg",
    isFavorite: false,
  },
]

// Mock data for recommended practitioners
const recommendedPractitioners = [
  {
    id: 1,
    name: "Dr. Lisa Martinez",
    title: "Holistic Health Coach",
    rating: 4.7,
    reviewCount: 89,
    specialties: ["Nutrition", "Holistic Health"],
    image: "/practitioner-4.jpg",
    isFavorite: false,
  },
  {
    id: 2,
    name: "James Wilson",
    title: "Meditation Expert",
    rating: 4.9,
    reviewCount: 112,
    specialties: ["Meditation", "Mindfulness"],
    image: "/practitioner-2.jpg",
    isFavorite: true,
  },
]

export default function UserRecommendations() {
  const [activeTab, setActiveTab] = useState("services")
  const [services, setServices] = useState(recommendedServices)
  const [practitioners, setPractitioners] = useState(recommendedPractitioners)

  const toggleFavorite = (type: "service" | "practitioner", id: number) => {
    if (type === "service") {
      setServices((prev) =>
        prev.map((service) => (service.id === id ? { ...service, isFavorite: !service.isFavorite } : service)),
      )
    } else {
      setPractitioners((prev) =>
        prev.map((practitioner) =>
          practitioner.id === id ? { ...practitioner, isFavorite: !practitioner.isFavorite } : practitioner,
        ),
      )
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Recommended For You</h2>
      <Tabs defaultValue="services" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="practitioners">Practitioners</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((service) => (
              <Card key={service.id} className="overflow-hidden">
                <div className="relative h-40">
                  <Image src={service.image || "/placeholder.svg"} alt={service.name} fill className="object-cover" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute top-2 right-2 rounded-full bg-white/80 ${
                      service.isFavorite ? "text-rose-500" : "text-gray-500"
                    } hover:bg-white`}
                    onClick={() => toggleFavorite("service", service.id)}
                  >
                    <Heart className={`h-5 w-5 ${service.isFavorite ? "fill-current" : ""}`} />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-1">{service.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">by {service.practitioner}</p>

                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{service.duration}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{service.type}</span>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex items-center justify-between">
                  <p className="font-semibold text-primary">{service.price}</p>
                  <Button size="sm">Book Now</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="practitioners">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {practitioners.map((practitioner) => (
              <Card key={practitioner.id} className="overflow-hidden">
                <div className="relative h-48">
                  <Image
                    src={practitioner.image || "/placeholder.svg"}
                    alt={practitioner.name}
                    fill
                    className="object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute top-2 right-2 rounded-full bg-white/80 ${
                      practitioner.isFavorite ? "text-rose-500" : "text-gray-500"
                    } hover:bg-white`}
                    onClick={() => toggleFavorite("practitioner", practitioner.id)}
                  >
                    <Heart className={`h-5 w-5 ${practitioner.isFavorite ? "fill-current" : ""}`} />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{practitioner.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{practitioner.title}</p>

                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(practitioner.rating) ? "fill-current" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">({practitioner.reviewCount})</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {practitioner.specialties.map((specialty) => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button className="w-full" variant="outline">
                    View Profile
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
