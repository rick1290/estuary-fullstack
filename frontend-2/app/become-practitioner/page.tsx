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
import { Check, Star, Wallet, Calendar, Eye, Users, Zap, Laptop, ArrowRight, ChevronDown, Sparkles } from "lucide-react"
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
      {/* Immersive Hero Section */}
      <div className="relative w-full h-[90vh] max-h-[800px] overflow-hidden">
        {/* Immersive gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-sage-100 via-terracotta-100 to-blush-100">
          {/* Texture overlay */}
          <div className="absolute inset-0 texture-grain opacity-20" />
          
          {/* Decorative blobs */}
          <div className="absolute top-20 -right-40 w-[600px] h-[600px] bg-terracotta-200/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-sage-200/40 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blush-200/20 rounded-full blur-3xl" />
        </div>

        <div className="container relative z-20 h-full mx-auto px-4">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-5xl"
            >
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-8 shadow-sm">
                <Sparkles className="h-4 w-4 text-terracotta-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">For Practitioners</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium text-olive-900 mb-6 leading-tight">
                Share Your Gifts.
                <br />
                <span className="text-gradient bg-gradient-to-r from-terracotta-600 to-sage-600 bg-clip-text text-transparent">
                  Transform Lives.
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-olive-700 mb-10 max-w-3xl mx-auto leading-relaxed">
                Join our community of purpose-driven practitioners and create sustainable income while making a meaningful impact.
              </p>

              {/* Social proof */}
              <div className="flex flex-wrap justify-center gap-8 text-olive-600 mb-10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-sage-500 rounded-full" />
                  <span>500+ Trusted Practitioners</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-terracotta-500 rounded-full" />
                  <span>$1M+ Community Earnings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blush-500 rounded-full" />
                  <span>Growing Since 2020</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button
                  size="lg"
                  onClick={scrollToSubscriptionTiers}
                  className="px-8 py-6 text-lg rounded-2xl shadow-lg bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800"
                >
                  Begin Your Journey
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => howItWorksRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="px-8 py-6 text-lg rounded-2xl border-sage-300 text-sage-700 hover:bg-sage-50"
                >
                  How It Works
                </Button>
              </div>

              {/* Key benefits highlight */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                  {
                    icon: <Eye className="h-6 w-6" strokeWidth="1.5" />,
                    title: "Multiple Formats",
                    description: "Offer sessions, courses & workshops",
                  },
                  {
                    icon: <Wallet className="h-6 w-6" strokeWidth="1.5" />,
                    title: "Secure Payments",
                    description: "Get paid easily for your valuable work",
                  },
                  {
                    icon: <Users className="h-6 w-6" strokeWidth="1.5" />,
                    title: "Subscription Income",
                    description: "Create recurring revenue streams",
                  },
                ].map((benefit, index) => (
                  <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all">
                    <div className="w-12 h-12 bg-gradient-to-br from-sage-100 to-terracotta-100 text-olive-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      {benefit.icon}
                    </div>
                    <h3 className="font-semibold text-olive-900 mb-2">{benefit.title}</h3>
                    <p className="text-sm text-olive-600">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Organic scroll indicator */}
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
            <span className="text-olive-600 text-sm mb-2">Discover More</span>
            <ChevronDown className="h-6 w-6 text-olive-600" strokeWidth="1.5" />
          </motion.div>
        </motion.div>
      </div>

      {/* Wave connector from hero to benefits section */}
      <SectionConnector type="wave" fromColor="#000000" toColor="#f8f5f2" height={100} />

      {/* Enhanced Benefits Section */}
      <div className="bg-gradient-to-b from-sage-50/30 to-terracotta-50/30 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 texture-grain opacity-10" />
        <div className="absolute top-20 -right-40 w-[600px] h-[600px] bg-terracotta-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-sage-200/40 rounded-full blur-3xl" />

        <div className="container px-4 mx-auto py-20">
          <motion.div
            ref={benefitsRef}
            className="relative z-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                <Sparkles className="h-4 w-4 text-sage-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">Why Join Us</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
                The Estuary Advantage
              </h2>
              <p className="text-lg text-olive-600 max-w-3xl mx-auto leading-relaxed">
                Estuary is more than a marketplace—it's a complete ecosystem designed for practitioners to grow, build
                community, and create sustainable income streams.
              </p>
            </div>

            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" variants={containerVariants}>
              {[
                {
                  icon: <Eye className="h-12 w-12" strokeWidth="1.5" />,
                  title: "Offer Multiple Formats",
                  description:
                    "Create and sell sessions, courses, and workshops. Design offerings that match your expertise and your clients' needs.",
                },
                {
                  icon: <Wallet className="h-12 w-12" strokeWidth="1.5" />,
                  title: "Manage Your Practice",
                  description:
                    "Handle clients, bookings, and messages all in one place. We take care of the admin so you can focus on your work.",
                },
                {
                  icon: <Calendar className="h-12 w-12" strokeWidth="1.5" />,
                  title: "Secure Payments",
                  description:
                    "Accept payments securely and track your earnings. Get paid for your valuable work without payment hassles.",
                },
                {
                  icon: <Users className="h-12 w-12" strokeWidth="1.5" />,
                  title: "Estuary Streams",
                  description:
                    "Create subscription-based content streams for exclusive content and ongoing client support.",
                },
                {
                  icon: <Zap className="h-12 w-12" strokeWidth="1.5" />,
                  title: "Practitioner Community",
                  description:
                    "Join a network of aligned, purpose-driven practitioners. Share knowledge, collaborate, and grow together.",
                },
                {
                  icon: <Laptop className="h-12 w-12" strokeWidth="1.5" />,
                  title: "Integrated Platform",
                  description:
                    "Everything you need in one place - from client management to content creation to payment processing.",
                },
              ].map((benefit, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="h-full transition-all duration-300 hover:translate-y-[-8px] hover:shadow-xl border-0 bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl">
                    <CardContent className="p-8 text-center">
                      <div className="bg-gradient-to-br from-sage-100 to-terracotta-100 text-olive-700 rounded-2xl p-4 w-20 h-20 flex items-center justify-center mx-auto mb-6 transition-transform duration-300 hover:scale-110">
                        {benefit.icon}
                      </div>
                      <h3 className="text-xl font-semibold text-olive-900 mb-3">{benefit.title}</h3>
                      <p className="text-olive-600">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Curve connector from benefits to pricing section */}
      <SectionConnector type="curve" fromColor="#f8f5f2" toColor="#ffffff" height={100} />

      {/* Enhanced Subscription Tiers */}
      <div className="bg-gradient-to-b from-cream-50 to-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 texture-grain opacity-10" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blush-200/30 rounded-full blur-3xl" />

        <div className="container px-4 mx-auto py-20">
          <motion.div
            ref={subscriptionTiersRef}
            className="scroll-mt-20 relative z-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                <Sparkles className="h-4 w-4 text-terracotta-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">Pricing Plans</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
                Choose Your Path
              </h2>
              <p className="text-lg text-olive-600 max-w-3xl mx-auto leading-relaxed">
                We offer flexible tiers so you can start simple or scale big. Choose the plan that works for your
                practice.
              </p>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
              variants={containerVariants}
            >
              {[
                {
                  name: "Flow",
                  emoji: "🔹",
                  price: "FREE",
                  fee: "16% per transaction",
                  description: "Ideal for getting started",
                  features: [
                    "Full access to essential practitioner tools",
                    "Launch your profile and offerings",
                    "Accept payments and manage sessions",
                    "Access to Estuary Streams",
                  ],
                  highlight: false,
                  badge: "FREE",
                  badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
                },
                {
                  name: "Rhythm",
                  emoji: "🔸",
                  price: "$29/mo or $290/yr (save $58)",
                  fee: "12% per transaction",
                  description: "Perfect for building your client base",
                  features: [
                    "Everything in Flow",
                    "Direct messaging from your public profile",
                    "Boosted placement in Estuary search",
                    "Priority support",
                    "Custom profile URL",
                  ],
                  highlight: true,
                  badge: "POPULAR",
                  badgeColor: "bg-primary text-primary-foreground",
                },
                {
                  name: "Thrive",
                  emoji: "🔺",
                  price: "$59/mo or $590/yr (save $118)",
                  fee: "9% per transaction",
                  description: "Built for practitioners ready to scale",
                  features: [
                    "Everything in Rhythm",
                    "Send messages to all clients",
                    "Customize your standalone public pages",
                    "Advanced analytics dashboard",
                    "Dedicated account manager",
                  ],
                  highlight: false,
                  badge: "PREMIUM",
                  badgeColor: "bg-secondary text-secondary-foreground",
                },
              ].map((tier, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card
                    className={cn(
                      "h-full transition-all duration-500 relative border-0 rounded-2xl",
                      hoveredCard === tier.name ? "scale-105 shadow-2xl z-10" : "scale-100 shadow-lg z-0",
                      tier.highlight ? "bg-gradient-to-b from-sage-50 to-white" : "bg-white/80 backdrop-blur-sm",
                    )}
                    onMouseEnter={() => setHoveredCard(tier.name)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="absolute top-4 right-4">
                      <Badge className={cn("px-3 py-1 rounded-full", tier.highlight ? "bg-sage-200 text-olive-800" : "bg-terracotta-100 text-olive-700")}>{tier.badge}</Badge>
                    </div>

                    <CardContent className="pt-10 pb-6 px-6 text-center">
                      <div className="text-4xl mb-2">{tier.emoji}</div>
                      <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                      <p className="text-xl font-medium mb-1">{tier.price}</p>
                      <p className="text-sage-700 font-medium mb-4">Platform fee: {tier.fee}</p>
                      <p className="text-muted-foreground mb-6">{tier.description}</p>

                      <Separator className="my-6" />

                      <ul className="space-y-4 text-left mb-8">
                        {tier.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <div className="bg-sage-100 rounded-full p-1 mr-3 mt-0.5 flex-shrink-0">
                              <Check className="h-4 w-4 text-sage-700" strokeWidth="1.5" />
                            </div>
                            <span className="text-olive-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="px-6 pb-6">
                      <Button
                        variant={hoveredCard === tier.name ? "default" : "outline"}
                        className={cn(
                          "w-full py-6 rounded-2xl transition-all duration-300",
                          tier.highlight && hoveredCard !== tier.name
                            ? "border-sage-300 text-sage-700 hover:bg-sage-50"
                            : hoveredCard === tier.name
                            ? "bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800"
                            : "border-sage-300 text-sage-700 hover:bg-sage-50",
                        )}
                        onClick={() => handleGetStarted(tier.name)}
                      >
                        {hoveredCard === tier.name ? (
                          <span className="flex items-center">
                            Begin Your Journey <ArrowRight className="ml-2 h-4 w-4" strokeWidth="1.5" />
                          </span>
                        ) : (
                          "Begin Your Journey"
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Angle connector from pricing to how it works section */}
      <SectionConnector type="angle" fromColor="#ffffff" toColor="#f5f0eb" height={100} />

      {/* Enhanced How It Works Section */}
      <div className="bg-gradient-to-b from-white via-blush-50/30 to-cream-50 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 texture-grain opacity-10" />
        <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-terracotta-200/30 rounded-full blur-3xl" />

        <div className="container px-4 mx-auto py-20">
          <motion.div
            ref={howItWorksRef}
            className="scroll-mt-20 relative z-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                <Sparkles className="h-4 w-4 text-blush-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">The Process</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
                How to Get Started
              </h2>
              <p className="text-lg text-olive-600 max-w-3xl mx-auto leading-relaxed">
                Our simple application process helps you set up your practice on Estuary. Here's what to expect.
              </p>
            </div>

            <div className="flex justify-center mb-16">
              <div className="hidden md:flex items-center w-full max-w-4xl relative">
                {["Sign Up", "Complete Profile", "Add Services", "Set Up Payments", "Get Approved"].map(
                  (step, index) => (
                    <motion.div key={index} className="flex-1 text-center z-10" variants={itemVariants}>
                      <div className="relative">
                        <div
                          className={cn(
                            "w-14 h-14 mx-auto rounded-full flex items-center justify-center text-lg font-medium",
                            index === 0 ? "bg-sage-600 text-white" : "bg-sage-100 text-olive-600",
                          )}
                        >
                          {index + 1}
                        </div>
                      </div>
                      <div className="mt-3 font-medium">{step}</div>
                    </motion.div>
                  ),
                )}
                {/* Connection line */}
                <div className="absolute top-7 left-0 w-full h-0.5 bg-sage-200 -z-0"></div>
              </div>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants}>
                <Card className="h-full transition-all duration-300 hover:shadow-xl border-0 bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-semibold text-sage-700 mb-6">Practitioner Application Process</h3>
                    <ul className="space-y-6">
                      {[
                        {
                          primary: "Basic Info",
                          secondary: "Name, photo, bio, location, languages you speak",
                        },
                        {
                          primary: "Practice Details",
                          secondary: "Modality selection (limit to 6), certifications, years of experience",
                        },
                        {
                          primary: "Offerings Setup",
                          secondary: "Add at least one session, course, or workshop with pricing",
                        },
                        {
                          primary: "Estuary Stream (Optional)",
                          secondary: "Set up your subscription-based content stream",
                        },
                        {
                          primary: "Payout Information",
                          secondary: "Connect to Stripe for secure payments",
                        },
                      ].map((item, index) => (
                        <li key={index} className="flex">
                          <div className="bg-sage-100 rounded-full p-2 mr-4 mt-0.5 h-8 w-8 flex items-center justify-center flex-shrink-0">
                            <Check className="h-4 w-4 text-sage-700" strokeWidth="1.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg text-olive-900">{item.primary}</p>
                            <p className="text-olive-600">{item.secondary}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="h-full transition-all duration-300 hover:shadow-xl border-0 bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-semibold text-sage-700 mb-6">What Happens After Submission?</h3>
                    <ul className="space-y-6">
                      {[
                        {
                          primary: "Application Review",
                          secondary: "Our team reviews your application within 3-5 business days",
                        },
                        {
                          primary: "Profile Approval",
                          secondary: "You'll receive an email notification when your profile is approved",
                        },
                        {
                          primary: "Go Live",
                          secondary: "Your profile and offerings become visible on the Estuary marketplace",
                        },
                        {
                          primary: "Start Accepting Bookings",
                          secondary: "Begin receiving bookings and payments through the platform",
                        },
                        {
                          primary: "Ongoing Support",
                          secondary: "Access to practitioner resources and support as you grow",
                        },
                      ].map((item, index) => (
                        <li key={index} className="flex">
                          <div className="bg-terracotta-100 rounded-full p-2 mr-4 mt-0.5 h-8 w-8 flex items-center justify-center flex-shrink-0">
                            <Star className="h-4 w-4 text-terracotta-700" strokeWidth="1.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg text-olive-900">{item.primary}</p>
                            <p className="text-olive-600">{item.secondary}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Wave connector from how it works to testimonials section */}
      <SectionConnector type="wave" fromColor="#f5f0eb" toColor="#ffffff" height={100} />

      {/* Enhanced Testimonials Section */}
      <div className="bg-gradient-to-b from-cream-50 to-sage-50/30 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 texture-grain opacity-10" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blush-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sage-200/30 rounded-full blur-3xl" />

        <div className="container px-4 mx-auto py-20">
          <motion.div
            ref={testimonialsRef}
            className="relative z-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
                <Sparkles className="h-4 w-4 text-rose-600" strokeWidth="1.5" />
                <span className="text-sm text-olive-700 font-medium">Success Stories</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-olive-900 mb-6">
                Hear From Our Practitioners
              </h2>
              <p className="text-lg text-olive-600 max-w-3xl mx-auto leading-relaxed">
                Join hundreds of practitioners who have grown their practice with Estuary.
              </p>
            </div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
              variants={containerVariants}
            >
              {[
                {
                  name: "Sarah Johnson",
                  role: "Meditation Teacher",
                  image: "/practitioner-1.jpg",
                  testimonial:
                    "Estuary has transformed my practice. I've doubled my client base in just 3 months and the subscription stream gives me reliable monthly income. The platform is intuitive and the support team is always there when I need them.",
                },
                {
                  name: "Michael Chen",
                  role: "Life Coach",
                  image: "/practitioner-2.jpg",
                  testimonial:
                    "As someone who was hesitant about technology, I was surprised by how easy Estuary is to use. The booking system is seamless, and I love being able to offer both one-on-one sessions and group workshops in the same place.",
                },
                {
                  name: "Elena Rodriguez",
                  role: "Yoga Instructor",
                  image: "/practitioner-3.jpg",
                  testimonial:
                    "The Estuary Stream feature has been a game-changer for my business. I now have over 200 subscribers who receive weekly content, and it's become my main source of income. I wish I had joined sooner!",
                },
              ].map((testimonial, index) => (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="h-full transition-all duration-300 hover:translate-y-[-8px] hover:shadow-xl overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg rounded-2xl">
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-br from-sage-50 to-terracotta-50 p-6">
                        <div className="flex items-center">
                          <div className="h-16 w-16 border-4 border-white shadow-md mr-4 rounded-full bg-gradient-to-br from-sage-200 to-terracotta-200 flex items-center justify-center">
                            <span className="text-lg font-semibold text-olive-800">
                              {testimonial.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-olive-900">{testimonial.name}</h3>
                            <p className="text-olive-600">{testimonial.role}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 relative">
                        <div className="absolute top-0 right-6 transform -translate-y-1/2 text-sage-200 text-6xl font-serif">
                          "
                        </div>
                        <p className="italic relative z-10 text-olive-600">"{testimonial.testimonial}"</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Curve connector from testimonials to FAQ section */}
      <SectionConnector type="curve" fromColor="#ffffff" toColor="#f8f5f2" height={100} />

      {/* Enhanced FAQ Section with Accordion */}
      <div className="bg-gradient-to-b from-sage-50/30 to-cream-50 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 texture-grain opacity-10" />
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-terracotta-200/30 rounded-full blur-3xl" />

        <div className="container px-4 mx-auto py-20">
          <motion.div
            ref={faqRef}
            className="relative z-10"
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
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-olive-600 max-w-3xl mx-auto leading-relaxed">
                Find answers to common questions about joining Estuary as a practitioner.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <Accordion type="single" collapsible className="w-full bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                {[
                  {
                    question: "What are the platform fees?",
                    answer:
                      "Our fees vary by subscription tier: Flow (free) has a 16% transaction fee, Rhythm ($29/mo) has a 12% fee, and Thrive ($59/mo) has a 9% fee. There are no additional hidden costs.",
                  },
                  {
                    question: "How long does the verification process take?",
                    answer:
                      "Our verification process typically takes 3-5 business days once we receive all required information. We'll keep you updated throughout the process.",
                  },
                  {
                    question: "What is an Estuary Stream?",
                    answer:
                      "Estuary Streams are subscription-based content channels (similar to Patreon or OnlyFans) where you can share exclusive content with paying subscribers and build recurring revenue.",
                  },
                  {
                    question: "When and how do I get paid?",
                    answer:
                      "Payments are processed within 48 hours after a session is completed. Funds are transferred directly to your connected bank account through our secure payment system. We use Stripe to ensure fast and reliable payments.",
                  },
                  {
                    question: "Can I change my subscription tier later?",
                    answer:
                      "Yes, you can upgrade or downgrade your subscription tier at any time. Changes take effect at the start of your next billing cycle.",
                  },
                  {
                    question: "What types of offerings can I create?",
                    answer:
                      "You can create one-on-one sessions, group workshops, multi-session courses, and subscription-based content streams. Our platform is flexible to support various formats.",
                  },
                  {
                    question: "Do I need insurance to join Estuary?",
                    answer:
                      "While not required to join, we strongly recommend professional liability insurance for all practitioners. Some modalities may require insurance as part of our verification process.",
                  },
                  {
                    question: "Can I offer both virtual and in-person services?",
                    answer:
                      "Yes! Estuary supports both virtual and in-person offerings. You can set location preferences and manage your availability for each type of service separately.",
                  },
                ].map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-b border-sage-200">
                    <AccordionTrigger className="text-lg font-medium text-olive-900 py-4 hover:no-underline hover:text-sage-700">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-olive-600 pb-4 pt-2">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Wave connector from FAQ to CTA section */}
      <SectionConnector type="wave" fromColor="#f8f5f2" toColor="#ffffff" height={100} />

      {/* Enhanced CTA Section */}
      <div className="bg-white py-20">
        <div className="container px-4 mx-auto">
          <motion.div
            className="rounded-3xl overflow-hidden relative"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sage-600 via-terracotta-600 to-sage-700 z-0"></div>
            <div className="absolute inset-0 texture-grain opacity-20 z-0"></div>
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl" />

            <div className="relative z-10 p-12 md:p-16 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Ready to Transform Your Practice?</h2>
                <p className="text-xl mb-8 max-w-3xl mx-auto text-white/90 leading-relaxed">
                  Join hundreds of practitioners who are growing their business, reaching more clients, and creating
                  sustainable income on Estuary.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={scrollToSubscriptionTiers}
                    className="bg-white text-sage-700 hover:bg-white/90 px-8 py-6 text-lg rounded-2xl shadow-xl font-medium"
                  >
                    Begin Your Journey — Free to Start
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => howItWorksRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="border-white/40 text-white hover:bg-white/20 px-8 py-6 text-lg rounded-2xl backdrop-blur-sm"
                  >
                    Explore the Process
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
