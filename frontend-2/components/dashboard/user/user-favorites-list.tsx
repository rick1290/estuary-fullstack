"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, Clock, MapPin, Star } from "lucide-react"

// Mock data for favorite practitioners
const favoritePractitioners = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    title: "Mindfulness Coach",
    rating: 4.8,
    reviewCount: 124,
    specialties: ["Meditation", "Stress Management"],
    image: "/practitioner-1.jpg",
  },
  {
    id: 2,
    name: "Michael Chen",
    title: "Wellness Consultant",
    rating: 4.6,
    reviewCount: 98,
    specialties: ["Nutrition", "Fitness"],
    image: "/practitioner-2.jpg",
  },
  {
    id: 3,
    name: "Emma Wilson",
    title: "Yoga Instructor",
    rating: 4.9,
    reviewCount: 156,
    specialties: ["Yoga", "Meditation"],
    image: "/practitioner-3.jpg",
  },
]

// Mock data for favorite services
const favoriteServices = [
  {
    id: 1,
    name: "Mindfulness Meditation Session",
    practitioner: "Dr. Sarah Johnson",
    duration: "60 min",
    price: "$75",
    type: "Virtual",
    image: "/session-image-1.jpg",
  },
  {
    id: 2,
    name: "Stress Management Workshop",
    practitioner: "Michael Chen",
    duration: "90 min",
    price: "$120",
    type: "In-person",
    image: "/workshop-image-1.jpg",
  },
  {
    id: 3,
    name: "Yoga for Beginners",
    practitioner: "Emma Wilson",
    duration: "60 min",
    price: "$65",
    type: "Virtual",
    image: "/course-image-1.jpg",
  },
]

interface UserFavoritesListProps {
  type?: "practitioners" | "services"
}

export default function UserFavoritesList({ type = "practitioners" }: UserFavoritesListProps) {
  const [favorites, setFavorites] = useState({
    practitioners: favoritePractitioners,
    services: favoriteServices,
  })

  const handleRemoveFavorite = (type: "practitioners" | "services", id: number) => {
    setFavorites((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => item.id !== id),
    }))
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {type === "practitioners" &&
        favorites.practitioners.map((practitioner) => (
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
                className="absolute top-2 right-2 rounded-full bg-white/80 text-rose-500 hover:bg-white hover:text-rose-600"
                onClick={() => handleRemoveFavorite("practitioners", practitioner.id)}
              >
                <Heart className="h-5 w-5 fill-current" />
              </Button>
            </div>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium">{practitioner.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{practitioner.title}</p>

              <div className="flex items-center mb-3">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(practitioner.rating) ? "fill-current" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-2">({practitioner.reviewCount})</span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {practitioner.specialties.map((specialty) => (
                  <Badge key={specialty} variant="outline">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" className="w-full">
                View Profile
              </Button>
            </CardFooter>
          </Card>
        ))}

      {type === "services" &&
        favorites.services.map((service) => (
          <Card key={service.id} className="overflow-hidden">
            <div className="relative h-48">
              <Image src={service.image || "/placeholder.svg"} alt={service.name} fill className="object-cover" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 rounded-full bg-white/80 text-rose-500 hover:bg-white hover:text-rose-600"
                onClick={() => handleRemoveFavorite("services", service.id)}
              >
                <Heart className="h-5 w-5 fill-current" />
              </Button>
            </div>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium line-clamp-1">{service.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">by {service.practitioner}</p>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5">
                <Clock className="h-4 w-4" />
                <span>{service.duration}</span>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                <MapPin className="h-4 w-4" />
                <span>{service.type}</span>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between pt-0">
              <p className="font-medium text-primary">{service.price}</p>
              <Button size="sm">Book Now</Button>
            </CardFooter>
          </Card>
        ))}

      {((type === "practitioners" && favorites.practitioners.length === 0) ||
        (type === "services" && favorites.services.length === 0)) && (
        <div className="col-span-full text-center py-12">
          <p className="text-muted-foreground mb-4">You don't have any favorites yet.</p>
          <Button>Explore {type === "practitioners" ? "Practitioners" : "Services"}</Button>
        </div>
      )}
    </div>
  )
}
