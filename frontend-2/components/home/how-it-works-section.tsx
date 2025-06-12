"use client"
import { Search, UserPlus, CalendarClock, Heart } from "lucide-react"

const steps = [
  {
    icon: <Search className="h-10 w-10" />,
    title: "Discover",
    description:
      "Browse our diverse community of wellness practitioners, courses, and experiences tailored to your unique journey.",
  },
  {
    icon: <UserPlus className="h-10 w-10" />,
    title: "Connect",
    description:
      "Reach out to practitioners who resonate with your needs and establish meaningful connections for your growth.",
  },
  {
    icon: <CalendarClock className="h-10 w-10" />,
    title: "Schedule",
    description: "Book sessions, workshops, or courses with ease through our intuitive scheduling system.",
  },
  {
    icon: <Heart className="h-10 w-10" />,
    title: "Transform",
    description: "Experience personal growth and transformation through consistent practice and expert guidance.",
  },
]

const HowItWorksSection = () => {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-background to-muted/60 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-[20%] right-[10%] w-[200px] h-[200px] rounded-full bg-primary/5 blur-3xl opacity-70 z-0" />
      <div className="absolute bottom-[15%] left-[5%] w-[250px] h-[250px] rounded-full bg-primary/5 blur-3xl opacity-70 z-0" />

      <div className="container relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Your Journey with Estuary</h2>
          <div className="h-1 w-20 bg-primary/80 mx-auto rounded-full mb-4"></div>
          <p className="text-muted-foreground max-w-[800px] mx-auto">
            Begin your path to wellness and personal growth with these simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 justify-center">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="h-full flex flex-col items-center p-6 rounded-xl bg-card border border-border shadow-sm relative transition-all duration-300 hover:translate-y-[-8px] hover:shadow-md">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-primary/10 text-primary">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold text-center mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-center flex-grow">{step.description}</p>

                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-[40%] right-[-30px] w-[60px] h-[2px] bg-border z-1" />
                )}

                <div className="absolute top-[-15px] left-[-15px] w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
                  {index + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
