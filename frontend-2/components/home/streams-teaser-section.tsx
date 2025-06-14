"use client"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Play, Users, MessageCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function StreamsTeaserSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-white via-blush-50/30 to-sage-50/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 texture-grain opacity-10" />
      <div className="absolute top-20 -left-40 w-[600px] h-[600px] bg-blush-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-40 w-[500px] h-[500px] bg-sage-200/30 rounded-full blur-3xl" />

      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                <Sparkles className="h-4 w-4 text-blush-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">Coming Soon</span>
              </div>
              
              <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
                Join Our 
                <span className="text-gradient bg-gradient-to-r from-blush-600 to-sage-600 bg-clip-text text-transparent"> Living Streams</span>
              </h2>
              
              <p className="text-olive-700 text-lg mb-8 leading-relaxed">
                Connect with practitioners and fellow seekers in our vibrant online community. Experience live sessions, share insights, and deepen your journey through meaningful conversations and exclusive content.
              </p>
              
              {/* Feature list */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blush-100 flex items-center justify-center">
                    <Play className="h-5 w-5 text-blush-700" strokeWidth="1.5" />
                  </div>
                  <div>
                    <p className="font-medium text-olive-900">Live Sessions</p>
                    <p className="text-sm text-olive-600">Join practitioners for real-time guidance</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-sage-700" strokeWidth="1.5" />
                  </div>
                  <div>
                    <p className="font-medium text-olive-900">Community Connection</p>
                    <p className="text-sm text-olive-600">Share your journey with like-minded souls</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-terracotta-100 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-terracotta-700" strokeWidth="1.5" />
                  </div>
                  <div>
                    <p className="font-medium text-olive-900">Exclusive Content</p>
                    <p className="text-sm text-olive-600">Access special workshops and teachings</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-lg" 
                  size="lg"
                  asChild
                >
                  <Link href="/streams">
                    Explore Streams
                    <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="border-sage-300 text-sage-700 hover:bg-sage-50">
                  Learn More
                </Button>
              </div>
            </div>
            
            {/* Right Visual */}
            <div className="relative animate-slide-up" style={{animationDelay: '0.2s'}}>
              <Card className="overflow-hidden border-0 shadow-2xl">
                <div className="relative h-[400px] bg-gradient-to-br from-sage-100 to-blush-100">
                  <div className="absolute inset-0 texture-grain opacity-20" />
                  
                  {/* Placeholder for stream preview */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-white/80 backdrop-blur-sm mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <Play className="h-10 w-10 text-sage-700 ml-1" strokeWidth="1.5" />
                      </div>
                      <p className="text-olive-800 font-medium">Preview Coming Soon</p>
                    </div>
                  </div>
                  
                  {/* Live indicator */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-rose-500 text-white px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm font-medium">LIVE</span>
                  </div>
                  
                  {/* Viewer count */}
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-olive-700" strokeWidth="1.5" />
                      <span className="text-sm font-medium text-olive-800">1,247 watching</span>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 animate-float">
                <p className="text-xs text-olive-600 mb-1">Next Stream</p>
                <p className="font-semibold text-olive-900">Mindful Morning</p>
                <p className="text-sm text-sage-700">Tomorrow, 8am</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}