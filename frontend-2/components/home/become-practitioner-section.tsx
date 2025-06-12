"use client"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CheckCircle2, Sparkles, Heart, Shield, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Benefits list
const BENEFITS = [
  {
    icon: <Heart className="h-5 w-5" strokeWidth="1.5" />,
    title: "Share your gifts",
    description: "Connect with seekers who resonate with your unique approach"
  },
  {
    icon: <Shield className="h-5 w-5" strokeWidth="1.5" />,
    title: "Practice with ease",
    description: "We handle the logistics so you can focus on transformation"
  },
  {
    icon: <TrendingUp className="h-5 w-5" strokeWidth="1.5" />,
    title: "Grow sustainably",
    description: "Build a thriving practice that honors your values"
  },
]

export default function BecomePractitionerSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-cream-50 via-terracotta-50/30 to-sage-50/30 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 texture-grain opacity-10" />
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-sage-200/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-terracotta-200/30 rounded-full blur-3xl" />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="order-2 lg:order-1 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
              <Sparkles className="h-4 w-4 text-terracotta-600" strokeWidth="1.5" />
              <span className="text-sm text-olive-700 font-medium">For Practitioners</span>
            </div>
            
            <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
              Share Your Gifts
              <br />
              <span className="text-gradient bg-gradient-to-r from-terracotta-600 to-sage-600 bg-clip-text text-transparent">
                Transform Lives
              </span>
            </h2>
            
            <p className="text-olive-700 text-lg mb-8 leading-relaxed">
              Join our community of healers, coaches, and guides. Create meaningful connections 
              and grow your practice in a space that honors your expertise and supports your journey.
            </p>

            <div className="space-y-4 mb-10">
              {BENEFITS.map((benefit, index) => (
                <div key={index} className="flex gap-4 animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-sage-100 to-terracotta-100 flex items-center justify-center text-olive-700">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-olive-900 mb-1">{benefit.title}</h3>
                    <p className="text-olive-600 text-sm">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Button 
                className="bg-gradient-to-r from-terracotta-600 to-terracotta-700 hover:from-terracotta-700 hover:to-terracotta-800 shadow-lg" 
                size="lg"
                asChild
              >
                <Link href="/become-practitioner">
                  Apply to Join
                  <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-sage-300 text-sage-700 hover:bg-sage-50">
                Learn More
              </Button>
            </div>
          </div>

          <div className="order-1 lg:order-2 animate-slide-up" style={{animationDelay: '0.2s'}}>
            <Card className="overflow-hidden border-0 shadow-2xl">
              <div className="relative h-[400px] lg:h-[500px] bg-gradient-to-br from-sage-100 to-terracotta-100">
                <div className="absolute inset-0 texture-grain opacity-20" />
                
                {/* Placeholder visual */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 rounded-full bg-white/80 backdrop-blur-sm mx-auto mb-6 flex items-center justify-center shadow-xl">
                      <Heart className="h-16 w-16 text-terracotta-600" strokeWidth="1.5" />
                    </div>
                    <p className="text-olive-800 font-medium text-lg">Your Practice Awaits</p>
                  </div>
                </div>
                
                {/* Stats overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-olive-900/80 to-transparent">
                  <div className="grid grid-cols-3 gap-4 text-white">
                    <div className="text-center">
                      <p className="text-3xl font-bold">500+</p>
                      <p className="text-sm opacity-90">Practitioners</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">10k+</p>
                      <p className="text-sm opacity-90">Sessions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">4.9</p>
                      <p className="text-sm opacity-90">Avg Rating</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}