"use client"
import { useState } from "react"
import type React from "react"
import { ArrowRight, Mail, Sparkles, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export default function EmailSignupSection() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you would send this to your API
    console.log("Email submitted:", email)
    setSubmitted(true)
  }

  return (
    <section className="py-20 bg-gradient-to-b from-sage-50/30 to-cream-50 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 texture-grain opacity-10" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-terracotta-200/30 blur-3xl top-[10%] right-[-200px] z-0" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-sage-200/30 blur-3xl bottom-[5%] left-[-100px] z-0" />

      <div className="container relative z-10">
        <Card className="max-w-4xl mx-auto border-0 shadow-2xl overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-br from-terracotta-100 via-sage-100 to-blush-100 p-1">
            <CardContent className="bg-cream-50 p-12 rounded-[calc(theme(borderRadius.lg)-4px)]">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                  <Heart className="h-4 w-4 text-rose-600" strokeWidth="1.5" />
                  <span className="text-sm text-olive-700 font-medium">Join Our Community</span>
                </div>
                
                <h2 className="text-3xl font-bold tracking-tight text-olive-900 mb-4">Begin Your Transformation</h2>
                <p className="text-olive-600 text-lg max-w-2xl mx-auto">
                  Join thousands on their wellness journey. Receive personalized recommendations, exclusive offers, and inspiring content delivered with love.
                </p>
              </div>

              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="max-w-lg mx-auto">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Mail className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
                      </div>
                      <Input
                        type="email"
                        placeholder="Enter your email to start"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-12 pr-32 py-6 text-lg border-2 border-sage-200 focus:border-sage-400 rounded-2xl bg-white/80 backdrop-blur-sm"
                      />
                      <Button 
                        type="submit" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-lg"
                        size="lg"
                      >
                        <span className="hidden sm:inline">Get Started</span>
                        <span className="sm:hidden">Join</span>
                        <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-center space-y-4">
                    <p className="text-sm text-olive-600">
                      By joining, you agree to our Terms of Service and Privacy Policy
                    </p>
                    
                    {/* Benefits */}
                    <div className="flex flex-wrap justify-center gap-6 text-sm text-olive-600">
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
                </form>
              ) : (
                <div className="text-center p-8 bg-gradient-to-br from-sage-50 to-terracotta-50 rounded-2xl animate-scale-in">
                  <div className="w-16 h-16 rounded-full bg-sage-200 mx-auto mb-4 flex items-center justify-center">
                    <Heart className="h-8 w-8 text-sage-700" strokeWidth="1.5" />
                  </div>
                  <p className="text-olive-900 font-semibold text-xl mb-2">Welcome to the Journey!</p>
                  <p className="text-olive-600 max-w-md mx-auto">
                    Check your inbox for a warm welcome and your first steps toward transformation.
                  </p>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </section>
  )
}