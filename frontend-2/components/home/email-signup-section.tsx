"use client"
import { ArrowRight, Sparkles, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuthModal } from "@/components/auth/auth-provider"

export default function EmailSignupSection() {
  const { openAuthModal } = useAuthModal()

  return (
    <section className="py-20 bg-gradient-to-b from-sage-50/30 to-cream-50 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 texture-grain opacity-10" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-terracotta-200/30 blur-3xl top-[10%] right-[-200px] z-0" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-sage-200/30 blur-3xl bottom-[5%] left-[-100px] z-0" />

      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <Card className="max-w-4xl mx-auto border-0 shadow-2xl overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-br from-terracotta-100 via-sage-100 to-blush-100 p-1">
            <CardContent className="bg-cream-50 p-12 rounded-[calc(theme(borderRadius.lg)-4px)]">
              <div className="text-center space-y-8">
                <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-2 shadow-sm">
                  <Heart className="h-4 w-4 text-rose-600" strokeWidth="1.5" />
                  <span className="text-sm text-olive-700 font-medium">Join Our Community</span>
                </div>

                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-olive-900 mb-4">Begin Your Transformation</h2>
                <p className="text-olive-600 text-lg max-w-2xl mx-auto mb-8">
                  Join thousands on their wellness journey. Receive personalized recommendations, exclusive offers, and inspiring content delivered with love.
                </p>

                {/* Get Started Button */}
                <div>
                  <Button
                    onClick={() => openAuthModal({
                      defaultTab: 'signup',
                      title: 'Begin Your Journey',
                      description: 'Create your account to start your transformation'
                    })}
                    size="lg"
                    className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-lg hover:shadow-xl transition-all px-8 py-6 text-lg rounded-xl"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" strokeWidth="1.5" />
                  </Button>
                </div>

                {/* Benefits */}
                <div className="flex flex-wrap justify-center gap-6 text-sm text-olive-600 pt-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-terracotta-600" strokeWidth="1.5" />
                    <span>Weekly inspiration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                    <span>Exclusive offers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blush-600" strokeWidth="1.5" />
                    <span>Community updates</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </section>
  )
}