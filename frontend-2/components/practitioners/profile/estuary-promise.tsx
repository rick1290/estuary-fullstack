import { Check, Calendar, Shield, HeartHandshake, Sparkles } from "lucide-react"

const promises = [
  {
    icon: Check,
    title: "Personalized Journey",
    description: "Every session crafted to honor your unique needs, goals, and healing journey",
    accent: "bg-sage-100 text-sage-700",
  },
  {
    icon: Calendar,
    title: "Flexible Wellness",
    description: "Schedule sessions that flow with your life's rhythm and commitments",
    accent: "bg-terracotta-50 text-terracotta-600",
  },
  {
    icon: Shield,
    title: "Sacred Space",
    description: "A nurturing environment where transformation happens with compassion",
    accent: "bg-cream-200 text-olive-700",
  },
  {
    icon: Sparkles,
    title: "Ongoing Growth",
    description: "Continuous support and guidance as you evolve on your wellness path",
    accent: "bg-sage-50 text-sage-600",
  },
]

export default function EstuaryPromise() {
  return (
    <div className="mt-16 mb-8">
      <div className="bg-gradient-to-br from-terracotta-100/40 via-sage-100/30 to-sage-200/40 rounded-2xl px-6 py-10 sm:px-10 sm:py-14">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-medium tracking-widest uppercase text-sage-600 mb-3">Our Commitment to You</p>
          <h2 className="font-serif text-xl sm:text-2xl font-normal text-olive-900 mb-3">
            The Estuary <em className="italic text-terracotta-600">Promise</em>
          </h2>
          <p className="text-[15px] font-light text-olive-600 leading-relaxed max-w-lg mx-auto">
            We're dedicated to creating transformative wellness experiences that honor your unique journey
          </p>
        </div>

        {/* Promise grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {promises.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 p-5 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${item.accent} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-5 w-5" strokeWidth="1.5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-medium text-olive-900 mb-1">{item.title}</h3>
                    <p className="text-[13px] font-light text-olive-500 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Trust line */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 text-olive-600">
            <HeartHandshake className="h-4 w-4 text-terracotta-500" strokeWidth="1.5" />
            <span className="text-xs font-light">Trusted by thousands on their wellness journey</span>
          </div>
        </div>
      </div>
    </div>
  )
}
