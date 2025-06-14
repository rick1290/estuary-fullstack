import { Check, Calendar, Shield, HeartHandshake, LineChart, Sparkles } from "lucide-react"

export default function EstuaryPromise() {
  return (
    <div className="mt-16 mb-8 animate-fade-in" style={{animationDelay: '1s'}}>
      <div className="bg-gradient-to-br from-sage-50 via-cream-50 to-terracotta-50 rounded-3xl p-12 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 texture-grain opacity-20" />
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-terracotta-200/30 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <Sparkles className="h-4 w-4 text-terracotta-600" strokeWidth="1.5" />
              <span className="text-sm text-olive-700 font-medium">Our Commitment to You</span>
            </div>
            <h2 className="text-3xl font-bold text-olive-900 mb-3">The Estuary Promise</h2>
            <p className="text-olive-700 max-w-2xl mx-auto text-lg font-light">
              We're dedicated to creating transformative wellness experiences that honor your unique journey
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <div className="flex flex-col items-center text-center group">
              <div className="bg-white shadow-lg p-4 rounded-2xl mb-4 group-hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-sage-400 to-sage-500 rounded-xl flex items-center justify-center">
                  <Check className="h-6 w-6 text-white" strokeWidth="2" />
                </div>
              </div>
              <h3 className="font-semibold text-olive-900 mb-2">Personalized Journey</h3>
              <p className="text-sm text-olive-600 leading-relaxed">
                Every session crafted to honor your unique needs, goals, and healing journey
              </p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="bg-white shadow-lg p-4 rounded-2xl mb-4 group-hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-terracotta-400 to-terracotta-500 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" strokeWidth="1.5" />
                </div>
              </div>
              <h3 className="font-semibold text-olive-900 mb-2">Flexible Wellness</h3>
              <p className="text-sm text-olive-600 leading-relaxed">
                Schedule sessions that flow with your life's rhythm and commitments
              </p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="bg-white shadow-lg p-4 rounded-2xl mb-4 group-hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-blush-400 to-blush-500 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" strokeWidth="1.5" />
                </div>
              </div>
              <h3 className="font-semibold text-olive-900 mb-2">Sacred Space</h3>
              <p className="text-sm text-olive-600 leading-relaxed">
                A nurturing environment where transformation happens with compassion
              </p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="bg-white shadow-lg p-4 rounded-2xl mb-4 group-hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-olive-500 to-olive-600 rounded-xl flex items-center justify-center">
                  <LineChart className="h-6 w-6 text-white" strokeWidth="1.5" />
                </div>
              </div>
              <h3 className="font-semibold text-olive-900 mb-2">Ongoing Growth</h3>
              <p className="text-sm text-olive-600 leading-relaxed">
                Continuous support and guidance as you evolve on your wellness path
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center justify-center gap-3 bg-white shadow-lg px-6 py-3 rounded-full">
              <HeartHandshake className="h-5 w-5 text-sage-600" strokeWidth="1.5" />
              <span className="text-olive-800 font-medium">Trusted by thousands on their wellness journey</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
