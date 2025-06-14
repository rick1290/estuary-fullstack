"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Check, Star, Wallet, Calendar, Eye, Users, User, Zap, Laptop, ArrowRight, ChevronDown, Sparkles, Heart, Quote } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import BackgroundPattern from "@/components/ui/background-pattern"
import SectionConnector from "@/components/home/section-connector"
import LoginModal from "@/components/auth/login-modal"

// Animation variants for staggered animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
}

export default function BecomePractitionerPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [scrollY, setScrollY] = useState(0)

  // References for scroll animations
  const subscriptionTiersRef = useRef<HTMLDivElement>(null)
  const benefitsRef = useRef<HTMLDivElement>(null)
  const howItWorksRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const faqRef = useRef<HTMLDivElement>(null)

  // Handle scroll events for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSubscriptionTiers = () => {
    subscriptionTiersRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleGetStarted = (tier: string) => {
    setSelectedTier(tier)

    // If already authenticated, navigate directly
    if (isAuthenticated) {
      router.push(`/become-practitioner/application?tier=${tier.toLowerCase()}`)
    } else {
      // Otherwise show login modal
      setLoginModalOpen(true)
    }
  }

  const handleLoginSuccess = () => {
    setLoginModalOpen(false)

    // If user is now authenticated and we have a selected tier, navigate
    if (isAuthenticated && selectedTier) {
      router.push(`/become-practitioner/application?tier=${selectedTier.toLowerCase()}`)
    }
  }

  return (
    <>
      {/* Immersive Hero Section with Split Layout */}
      <div className="relative w-full min-h-[90vh] overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage-50 via-cream-50 to-terracotta-50/30">
          <div className="absolute inset-0 texture-grain opacity-20" />
          <div className="absolute top-20 -right-40 w-[600px] h-[600px] bg-terracotta-200/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-sage-200/30 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '2s'}} />
        </div>

        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 relative z-20 h-full mx-auto py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center h-full">
            {/* Left Column - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-left"
            >
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-8 shadow-sm">
                <Sparkles className="h-4 w-4 text-terracotta-600 animate-sparkle" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">Join Our Community</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-medium text-olive-900 mb-6 leading-tight">
                Share Your Gifts,
                <br />
                <span className="text-gradient bg-gradient-to-r from-sage-600 to-terracotta-600 bg-clip-text text-transparent">
                  Transform Lives
                </span>
              </h1>
              
              <p className="text-xl text-olive-700 mb-8 leading-relaxed">
                Build a thriving wellness practice on your terms. Connect with clients who need your unique expertise.
              </p>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-6 text-sm mb-10">
                <div className="flex items-center gap-3 group">
                  <div className="w-10 h-10 bg-gradient-to-br from-sage-100 to-terracotta-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-5 w-5 text-sage-700" strokeWidth="1.5" />
                  </div>
                  <div>
                    <p className="font-bold text-olive-900">523+</p>
                    <p className="text-xs text-olive-600">Active Practitioners</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-10 h-10 bg-gradient-to-br from-terracotta-100 to-blush-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Heart className="h-5 w-5 text-terracotta-700" strokeWidth="1.5" />
                  </div>
                  <div>
                    <p className="font-bold text-olive-900">10K+</p>
                    <p className="text-xs text-olive-600">Lives Transformed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="w-10 h-10 bg-gradient-to-br from-blush-100 to-sage-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wallet className="h-5 w-5 text-blush-700" strokeWidth="1.5" />
                  </div>
                  <div>
                    <p className="font-bold text-olive-900">$2M+</p>
                    <p className="text-xs text-olive-600">Paid to Practitioners</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={scrollToSubscriptionTiers}
                  className="px-8 py-6 text-lg bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 shadow-lg hover:shadow-xl transition-all"
                >
                  Start Your Journey
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => howItWorksRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="px-8 py-6 text-lg border-sage-300 text-sage-700 hover:bg-sage-50"
                >
                  Learn More
                </Button>
              </div>
            </motion.div>

            {/* Right Column - Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="relative h-full min-h-[500px] lg:block hidden"
            >
              <div className="relative h-full rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop"
                  alt="Wellness practitioner leading a workshop"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-olive-900/30 to-transparent" />
                
                {/* Floating testimonial card */}
                <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg animate-float">
                  <div className="flex items-start gap-4">
                    <Quote className="h-8 w-8 text-sage-300 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-olive-700 italic mb-2">
                        "Estuary gave me the freedom to build my practice my way. I'm now earning 3x what I made in my corporate job while helping others heal."
                      </p>
                      <div className="flex items-center gap-3">
                        <img 
                          src="https://i.pravatar.cc/40?img=47"
                          alt="Sarah"
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <p className="text-xs font-medium text-olive-900">Sarah Chen</p>
                          <p className="text-xs text-olive-600">Mindfulness Coach</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
            className="flex flex-col items-center"
          >
            <ChevronDown className="h-6 w-6 text-olive-600 animate-bounce" strokeWidth="1.5" />
          </motion.div>
        </motion.div>
      </div>

      {/* Image Divider - Practitioner in Action */}
      <div className="relative h-[400px] lg:h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=800&fit=crop"
            alt="Practitioners working with clients"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-olive-900/40 to-sage-50" />
        </div>
        
        <div className="relative h-full flex items-center justify-center">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl lg:text-4xl font-medium text-white mb-4">
              Your expertise deserves a platform that
              <span className="block mt-2 text-gradient bg-gradient-to-r from-terracotta-300 to-sage-300 bg-clip-text text-transparent">
                honors your worth
              </span>
            </h2>
          </div>
        </div>
      </div>

      {/* Enhanced Benefits Section with Images */}
      <div className="bg-gradient-to-b from-sage-50/30 to-cream-50 relative overflow-hidden">
        <div className="absolute inset-0 texture-grain opacity-10" />
        
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto py-20">
          <motion.div
            ref={benefitsRef}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                <Sparkles className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">The Estuary Difference</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
                Everything You Need to Succeed
              </h2>
              <p className="text-lg text-olive-600 max-w-3xl mx-auto leading-relaxed">
                We've thought of everything so you can focus on what you do best—helping others transform their lives.
              </p>
            </div>

            {/* Benefits with alternating image/text layout */}
            <div className="space-y-20">
              {[
                {
                  title: "Multiple Revenue Streams",
                  description: "Offer sessions, courses, workshops, and subscription content. Build diverse income streams that work for your lifestyle.",
                  features: ["1-on-1 Sessions", "Group Workshops", "Online Courses", "Subscription Streams"],
                  image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop",
                  imageAlt: "Practitioner dashboard showing multiple services"
                },
                {
                  title: "Your Practice, Your Way",
                  description: "Set your own schedule, prices, and boundaries. Work from anywhere, whether offering virtual or in-person services.",
                  features: ["Flexible Scheduling", "Custom Pricing", "Virtual & In-Person", "Automated Bookings"],
                  image: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=600&h=400&fit=crop",
                  imageAlt: "Practitioner working remotely",
                  reverse: true
                },
                {
                  title: "Community & Support",
                  description: "Join a thriving community of like-minded practitioners. Get support, share insights, and grow together.",
                  features: ["Practitioner Forums", "Monthly Workshops", "Mentorship Program", "24/7 Support"],
                  image: "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=600&h=400&fit=crop",
                  imageAlt: "Community of practitioners collaborating"
                }
              ].map((benefit, index) => (
                <motion.div 
                  key={index} 
                  variants={itemVariants}
                  className={cn(
                    "grid lg:grid-cols-2 gap-12 items-center",
                    benefit.reverse && "lg:grid-flow-col-dense"
                  )}
                >
                  <div className={cn("space-y-6", benefit.reverse && "lg:col-start-2")}>
                    <h3 className="text-3xl font-bold text-olive-900">{benefit.title}</h3>
                    <p className="text-lg text-olive-700 leading-relaxed">{benefit.description}</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {benefit.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="h-4 w-4 text-sage-700" />
                          </div>
                          <span className="text-olive-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={cn("relative", benefit.reverse && "lg:col-start-1")}>
                    <div className="rounded-2xl overflow-hidden shadow-2xl">
                      <img 
                        src={benefit.image}
                        alt={benefit.imageAlt}
                        className="w-full h-[400px] object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-terracotta-200/30 rounded-full blur-2xl" />
                    <div className="absolute -top-4 -left-4 w-24 h-24 bg-sage-200/30 rounded-full blur-2xl" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Subscription Tiers - Keep existing but add warmth */}
      <div className="bg-gradient-to-b from-cream-50 to-white relative overflow-hidden">
        <div className="absolute inset-0 texture-grain opacity-10" />
        
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto py-20">
          <motion.div
            ref={subscriptionTiersRef}
            className="scroll-mt-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                <Sparkles className="h-4 w-4 text-terracotta-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">Simple, Transparent Pricing</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
                Choose Your Growth Path
              </h2>
              <p className="text-lg text-olive-600 max-w-3xl mx-auto leading-relaxed">
                Start free and scale as you grow. No hidden fees, no surprises.
              </p>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
              variants={containerVariants}
            >
              {[
                {
                  name: "Flow",
                  emoji: "🌱",
                  price: "FREE",
                  fee: "16% per transaction",
                  description: "Perfect for getting started",
                  features: [
                    "List unlimited services",
                    "Accept secure payments",
                    "Basic analytics",
                    "Community support",
                  ],
                  highlight: false,
                  cta: "Start Free"
                },
                {
                  name: "Rhythm",
                  emoji: "🌿",
                  price: "$29/mo",
                  fee: "12% per transaction",
                  description: "For growing practices",
                  features: [
                    "Everything in Flow",
                    "Priority in search results",
                    "Advanced messaging",
                    "Custom booking page",
                    "Priority support",
                  ],
                  highlight: true,
                  cta: "Most Popular"
                },
                {
                  name: "Thrive",
                  emoji: "🌳",
                  price: "$59/mo",
                  fee: "9% per transaction",
                  description: "For established practitioners",
                  features: [
                    "Everything in Rhythm",
                    "Lowest transaction fees",
                    "Advanced analytics",
                    "White-label options",
                    "Dedicated support",
                  ],
                  highlight: false,
                  cta: "Scale Up"
                },
              ].map((tier, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card
                    className={cn(
                      "h-full transition-all duration-500 relative border-0 rounded-2xl",
                      hoveredCard === tier.name ? "scale-105 shadow-2xl z-10" : "scale-100 shadow-lg z-0",
                      tier.highlight ? "bg-gradient-to-b from-sage-50 to-white" : "bg-white",
                    )}
                    onMouseEnter={() => setHoveredCard(tier.name)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {tier.highlight && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-sage-600 to-terracotta-600 text-white px-4 py-1">
                          MOST POPULAR
                        </Badge>
                      </div>
                    )}

                    <CardContent className="pt-10 pb-6 px-6 text-center">
                      <div className="text-5xl mb-4">{tier.emoji}</div>
                      <h3 className="text-2xl font-bold mb-2 text-olive-900">{tier.name}</h3>
                      <p className="text-3xl font-bold mb-1 text-olive-900">{tier.price}</p>
                      <p className="text-sage-700 font-medium mb-4">{tier.fee}</p>
                      <p className="text-olive-600 mb-6">{tier.description}</p>

                      <Separator className="my-6 bg-sage-100" />

                      <ul className="space-y-4 text-left mb-8">
                        {tier.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <div className="bg-sage-100 rounded-full p-1 mr-3 mt-0.5 flex-shrink-0">
                              <Check className="h-4 w-4 text-sage-700" strokeWidth="2" />
                            </div>
                            <span className="text-olive-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="px-6 pb-6">
                      <Button
                        className={cn(
                          "w-full py-6 rounded-xl transition-all duration-300",
                          tier.highlight || hoveredCard === tier.name
                            ? "bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 text-white shadow-lg"
                            : "border-2 border-sage-300 text-sage-700 hover:bg-sage-50",
                        )}
                        onClick={() => handleGetStarted(tier.name)}
                      >
                        {tier.cta}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Real Practitioner Stories with Photos */}
      <div className="bg-gradient-to-b from-white to-sage-50/30 relative overflow-hidden">
        <div className="absolute inset-0 texture-grain opacity-10" />
        
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto py-20">
          <motion.div
            ref={testimonialsRef}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                <Heart className="h-4 w-4 text-rose-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">Real Stories</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
                Practitioners Thriving on Estuary
              </h2>
              <p className="text-lg text-olive-600 max-w-3xl mx-auto leading-relaxed">
                Hear from practitioners who've transformed their careers and lives through our platform.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: "Dr. Sarah Johnson",
                  role: "Mindfulness Coach",
                  image: "https://i.pravatar.cc/400?img=47",
                  story: "After 10 years in corporate wellness, I finally took the leap to start my own practice. Estuary made it possible to replace my salary in just 6 months. The subscription streams feature has been life-changing—I now have 200+ monthly subscribers.",
                  stats: { clients: "350+", revenue: "$12k/mo", rating: "4.9" }
                },
                {
                  name: "Michael Rivera",
                  role: "Yoga & Movement Therapist",
                  image: "https://i.pravatar.cc/400?img=33",
                  story: "I was skeptical about online platforms, but Estuary feels different. It's not just about transactions—it's a real community. I've connected with amazing practitioners and my virtual workshops are always full.",
                  stats: { clients: "180+", revenue: "$8k/mo", rating: "5.0" }
                }
              ].map((testimonial, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="h-full border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                    <div className="aspect-video relative">
                      <img 
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-olive-900/60 to-transparent" />
                      <div className="absolute bottom-4 left-6 text-white">
                        <h3 className="text-xl font-bold">{testimonial.name}</h3>
                        <p className="text-white/90">{testimonial.role}</p>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <p className="text-olive-700 mb-6 italic">"{testimonial.story}"</p>
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-sage-100">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-olive-900">{testimonial.stats.clients}</p>
                          <p className="text-xs text-olive-600">Happy Clients</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-olive-900">{testimonial.stats.revenue}</p>
                          <p className="text-xs text-olive-600">Monthly Revenue</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-olive-900">{testimonial.stats.rating}★</p>
                          <p className="text-xs text-olive-600">Client Rating</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* How It Works - Visual Timeline */}
      <div className="bg-gradient-to-b from-sage-50/30 to-cream-50 relative overflow-hidden">
        <div className="absolute inset-0 texture-grain opacity-10" />
        
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto py-20">
          <motion.div
            ref={howItWorksRef}
            className="scroll-mt-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                <Zap className="h-4 w-4 text-terracotta-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">Simple Process</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
                From Application to First Client in Days
              </h2>
              <p className="text-lg text-olive-600 max-w-3xl mx-auto leading-relaxed">
                Our streamlined process gets you up and running quickly, so you can focus on what matters.
              </p>
            </div>

            {/* Visual Timeline */}
            <div className="max-w-4xl mx-auto">
              {[
                {
                  step: 1,
                  title: "Create Your Profile",
                  description: "Share your story, expertise, and what makes you unique",
                  time: "15 minutes",
                  icon: <User className="h-6 w-6" />
                },
                {
                  step: 2,
                  title: "Add Your Services",
                  description: "List your sessions, workshops, or courses with pricing",
                  time: "20 minutes",
                  icon: <Calendar className="h-6 w-6" />
                },
                {
                  step: 3,
                  title: "Get Verified",
                  description: "Quick review process to ensure quality for clients",
                  time: "1-2 days",
                  icon: <Check className="h-6 w-6" />
                },
                {
                  step: 4,
                  title: "Welcome Your First Client",
                  description: "Start transforming lives and building your practice",
                  time: "Within a week",
                  icon: <Heart className="h-6 w-6" />
                }
              ].map((item, index) => (
                <motion.div key={index} variants={itemVariants} className="relative">
                  <div className="flex items-center mb-8">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-sage-100 to-terracotta-100 rounded-full flex items-center justify-center shadow-lg">
                        {item.icon}
                      </div>
                    </div>
                    <div className="ml-6 flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-olive-900">{item.title}</h3>
                        <Badge variant="secondary" className="bg-sage-100 text-olive-700">
                          {item.time}
                        </Badge>
                      </div>
                      <p className="text-olive-600">{item.description}</p>
                    </div>
                  </div>
                  {index < 3 && (
                    <div className="absolute left-8 top-16 h-full w-0.5 bg-sage-200" />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* FAQ Section - Keep existing */}
      <div className="bg-white relative overflow-hidden">
        <div className="absolute inset-0 texture-grain opacity-10" />
        
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto py-20">
          <motion.div
            ref={faqRef}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                <Sparkles className="h-4 w-4 text-olive-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">Common Questions</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
                Everything You Need to Know
              </h2>
            </div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {[
                  {
                    question: "How much can I realistically earn?",
                    answer: "Earnings vary based on your services, pricing, and client base. Our practitioners earn anywhere from $2,000 to $20,000+ per month. The average practitioner earns $6,500/month after their first year."
                  },
                  {
                    question: "Do I need certifications to join?",
                    answer: "While certifications aren't always required, they help build trust with clients. We verify all practitioners to ensure they have relevant experience and expertise in their field."
                  },
                  {
                    question: "Can I transfer my existing clients?",
                    answer: "Absolutely! Many practitioners bring their existing clients to Estuary for easier booking and payment management. You can invite them directly to your profile."
                  },
                  {
                    question: "What support do you provide?",
                    answer: "We offer 24/7 technical support, monthly practitioner workshops, marketing resources, and a vibrant community forum. Premium tiers get dedicated account managers."
                  },
                  {
                    question: "How do subscription streams work?",
                    answer: "Similar to Patreon, you can offer exclusive content, weekly check-ins, or ongoing support to subscribers. It's a great way to build recurring revenue while deepening client relationships."
                  }
                ].map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="bg-sage-50/50 rounded-xl px-6 border-0">
                    <AccordionTrigger className="text-lg font-medium text-olive-900 py-6 hover:no-underline hover:text-sage-700">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-olive-600 pb-6 pt-2">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="bg-gradient-to-b from-white to-cream-50 py-20">
        <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto">
          <motion.div
            className="relative rounded-3xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1552581234-26160f608093?w=1920&h=600&fit=crop"
                alt="Successful practitioners"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-sage-900/90 via-sage-800/80 to-terracotta-900/90" />
            </div>

            <div className="relative z-10 p-12 md:p-20 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                  Your Clients Are Waiting
                </h2>
                <p className="text-xl mb-10 max-w-3xl mx-auto text-white/90 leading-relaxed">
                  Join 500+ practitioners who've found freedom, fulfillment, and financial success on Estuary.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={scrollToSubscriptionTiers}
                    className="bg-white text-sage-700 hover:bg-white/90 px-10 py-6 text-lg shadow-xl"
                  >
                    Start Free Today
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/20 px-10 py-6 text-lg backdrop-blur-sm"
                    onClick={() => window.open('/practitioner-guide.pdf', '_blank')}
                  >
                    Download Success Guide
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onClose={handleLoginSuccess}
        redirectUrl={selectedTier ? `/become-practitioner/application?tier=${selectedTier.toLowerCase()}` : undefined}
        serviceType="practitioner-application"
      />
    </>
  )
}