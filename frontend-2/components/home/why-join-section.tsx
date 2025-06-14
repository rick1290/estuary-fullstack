"use client"
import Link from "next/link"
import { CheckCircle, Shield, Clock, HeartHandshake } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { useAuthModal } from "@/components/auth/auth-provider"

// Value propositions
const VALUE_PROPS = [
  {
    title: "Trusted Guides",
    description:
      "Every practitioner is carefully vetted, ensuring authentic expertise and a genuine commitment to your wellbeing.",
    icon: <CheckCircle className="h-6 w-6" />,
    color: "primary",
  },
  {
    title: "Safe Space",
    description:
      "Your journey is protected with secure transactions and a commitment to privacy and ethical practices.",
    icon: <Shield className="h-6 w-6" />,
    color: "teal",
  },
  {
    title: "Your Rhythm",
    description:
      "Flexible scheduling that respects your time and pace, allowing you to engage with services that fit your life.",
    icon: <Clock className="h-6 w-6" />,
    color: "orange",
  },
  {
    title: "Guided Journey",
    description:
      "Personalized recommendations and support to help you find the perfect practitioners and experiences for your needs.",
    icon: <HeartHandshake className="h-6 w-6" />,
    color: "purple",
  },
]

export default function WhyJoinSection() {
  const { openAuthModal } = useAuthModal()
  
  return (
    <section className="py-12 md:py-16 relative overflow-hidden bg-[url('/serene-forest-meditation.png')] bg-cover bg-center">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-0"></div>

      <div className="container relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Why Join Estuary</h2>
          <div className="h-1 w-20 bg-primary/80 mx-auto rounded-full mb-4"></div>
          <p className="text-muted-foreground max-w-[700px] mx-auto">
            More than a platform—a community where personal growth and connection flourish together.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6">
          {VALUE_PROPS.map((prop, index) => (
            <Card
              key={index}
              className="h-full bg-background/70 backdrop-blur-sm transition-all duration-300 hover:translate-y-[-8px] hover:shadow-lg border-t-4 border-t-primary"
            >
              <CardContent className="p-6">
                <div className="flex justify-center mb-4">
                  <Avatar className={`h-16 w-16 bg-${prop.color}-100 text-${prop.color}-600`}>{prop.icon}</Avatar>
                </div>
                <h3 className="text-lg font-semibold text-center mb-3">{prop.title}</h3>
                <p className="text-muted-foreground text-center text-sm">{prop.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-10 p-6 text-center bg-background/70 backdrop-blur-sm border-none shadow-lg">
          <CardContent className="p-0">
            <h3 className="text-xl font-medium mb-4">Ready to begin your journey of growth and connection?</h3>
            <Button 
              className="rounded-full px-8" 
              size="lg" 
              onClick={() => openAuthModal({ defaultTab: "signup" })}
            >
              Join Our Community
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
