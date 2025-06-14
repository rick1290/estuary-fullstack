"use client"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const categories = [
  {
    title: "Mindfulness & Meditation",
    description: "Cultivate presence and inner peace through guided practices.",
    image: "/mindful-meditation.png",
    link: "/marketplace?category=mindfulness",
  },
  {
    title: "Holistic Healing",
    description: "Experience traditional and alternative approaches to wellness.",
    image: "/serene-massage.png",
    link: "/marketplace?category=holistic-healing",
  },
  {
    title: "Life Coaching",
    description: "Navigate life's challenges with expert guidance and support.",
    image: "/guiding-light-path.png",
    link: "/marketplace?category=life-coaching",
  },
  {
    title: "Movement & Yoga",
    description: "Connect with your body through mindful movement practices.",
    image: "/mindful-yoga-community.png",
    link: "/marketplace?category=movement",
  },
  {
    title: "Creative Expression",
    description: "Unlock your creative potential through artistic exploration.",
    image: "/woodworking-workshop.png",
    link: "/marketplace?category=creative-expression",
  },
  {
    title: "Nature Connection",
    description: "Reconnect with the natural world for healing and inspiration.",
    image: "/serene-forest-meditation.png",
    link: "/marketplace?category=nature-connection",
  },
]

const FeaturedCategoriesSection = () => {
  return (
    <section className="py-12 md:py-16 bg-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-[15%] left-[8%] w-[250px] h-[250px] rounded-full bg-primary/5 blur-3xl opacity-70 z-0" />
      <div className="absolute bottom-[10%] right-[5%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl opacity-70 z-0" />

      <div className="container relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Explore Wellness Categories</h2>
          <div className="h-1 w-20 bg-primary/80 mx-auto rounded-full mb-4"></div>
          <p className="text-muted-foreground max-w-[800px] mx-auto">
            Discover diverse paths to wellness and personal growth through our curated categories.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <Card
              key={index}
              className="h-full flex flex-col rounded-xl overflow-hidden transition-all duration-300 hover:translate-y-[-8px] hover:shadow-md"
            >
              <div className="h-[180px] relative">
                <img
                  src={category.image || "/placeholder.svg"}
                  alt={category.title || "Category image"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              </div>
              <CardContent className="flex-grow p-6">
                <h3 className="text-lg font-semibold mb-3">{category.title}</h3>
                <p className="text-muted-foreground mb-4">{category.description}</p>
                <Button variant="ghost" className="mt-auto text-primary hover:bg-primary/10" asChild>
                  <Link href={category.link || "#"}>
                    Explore
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturedCategoriesSection
