"use client"
import Link from "next/link"
import { Users, GraduationCap, User, Sparkles, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

// Format options
const FORMAT_OPTIONS = [
  {
    title: "Group Workshops",
    description: "Transform together in intimate group experiences led by expert practitioners",
    icon: <Users className="h-8 w-8" strokeWidth="1.5" />,
    href: "/marketplace/workshops",
    gradient: "from-terracotta-100 to-terracotta-200",
    iconBg: "bg-terracotta-100",
    iconColor: "text-terracotta-700",
    features: ["Live interaction", "Community support", "Shared wisdom"],
  },
  {
    title: "Learning Journeys",
    description: "Embark on structured courses designed for deep, lasting transformation",
    icon: <GraduationCap className="h-8 w-8" strokeWidth="1.5" />,
    href: "/marketplace/courses",
    gradient: "from-sage-100 to-sage-200",
    iconBg: "bg-sage-100",
    iconColor: "text-sage-700",
    features: ["Self-paced learning", "Comprehensive curriculum", "Certification"],
  },
  {
    title: "Personal Sessions",
    description: "Connect one-on-one with practitioners for personalized guidance",
    icon: <User className="h-8 w-8" strokeWidth="1.5" />,
    href: "/marketplace/sessions",
    gradient: "from-blush-100 to-blush-200",
    iconBg: "bg-blush-100",
    iconColor: "text-blush-700",
    features: ["Tailored approach", "Deep connection", "Private space"],
  },
]

export default function ExploreFormatsSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-cream-50 to-white relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 texture-grain opacity-10" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-sage-200/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-terracotta-200/20 rounded-full blur-3xl" />

      <div className="container max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-sm">
            <Sparkles className="h-4 w-4 text-terracotta-600" strokeWidth="1.5" />
            <span className="text-sm text-olive-700 font-medium">Choose Your Path</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-olive-900 mb-4">Explore by Format</h2>
          <p className="text-olive-600 max-w-2xl mx-auto text-lg">
            Whether you thrive in community, prefer structured learning, or seek personal guidance—find the perfect way to begin your transformation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {FORMAT_OPTIONS.map((format, index) => (
            <Link 
              key={format.title} 
              href={format.href} 
              className="group block h-full animate-slide-up"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 border-sage-200 hover:border-sage-300 overflow-hidden bg-white">
                <div className={`h-2 bg-gradient-to-r ${format.gradient}`} />
                <CardContent className="p-8">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl ${format.iconBg} ${format.iconColor} mb-6 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    {format.icon}
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-3 text-olive-900">{format.title}</h3>
                  <p className="text-olive-600 mb-6 leading-relaxed">{format.description}</p>
                  
                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {format.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm text-olive-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* CTA */}
                  <div className="flex items-center text-sage-700 font-medium group-hover:text-sage-800">
                    <span>Explore {format.title}</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" strokeWidth="1.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}