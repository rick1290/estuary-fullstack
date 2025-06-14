"use client"
import { Quote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface TestimonialProps {
  name: string
  role: string
  quote: string
  rating: number
  avatarUrl: string
}

// Update the testimonials array to ensure all avatarUrl values have fallbacks:
const testimonials: TestimonialProps[] = [
  {
    name: "Sarah Johnson",
    role: "Yoga Enthusiast",
    quote:
      "Estuary has transformed my wellness journey. The practitioners are exceptional, and I've found a community that truly supports my growth.",
    rating: 5,
    avatarUrl: "/serene-gaze.png",
  },
  {
    name: "Michael Chen",
    role: "Meditation Practitioner",
    quote:
      "The guided meditation sessions have helped me manage stress in ways I never thought possible. I'm grateful for this sanctuary.",
    rating: 5,
    avatarUrl: "/abstract-user-icon.png",
  },
  {
    name: "Aisha Patel",
    role: "Wellness Coach",
    quote:
      "As both a client and a practitioner, I can attest to the transformative power of Estuary's platform. It connects people in meaningful ways.",
    rating: 5,
    avatarUrl: "/serene-indian-woman.png",
  },
  {
    name: "David Rodriguez",
    role: "Life Coaching Client",
    quote:
      "My life coach found through Estuary helped me navigate a difficult career transition with grace and confidence. Truly life-changing.",
    rating: 5,
    avatarUrl: "/thoughtful-gaze.png",
  },
]

const TestimonialsSection = () => {
  return (
    <section className="py-12 md:py-16 bg-muted/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-[10%] left-[5%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-3xl opacity-70 z-0" />
      <div className="absolute bottom-[10%] right-[5%] w-[250px] h-[250px] rounded-full bg-primary/5 blur-3xl opacity-70 z-0" />

      <div className="container relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Voices from Our Community</h2>
          <div className="h-1 w-20 bg-primary/80 mx-auto rounded-full mb-4"></div>
          <p className="text-muted-foreground max-w-[800px] mx-auto">
            Discover how Estuary has nurtured growth and transformation in the lives of our community members.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="h-full flex flex-col rounded-xl transition-all duration-300 hover:translate-y-[-8px] hover:shadow-md relative overflow-visible"
            >
              <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 bg-background rounded-full p-0.5 shadow-sm">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={testimonial.avatarUrl || "/abstract-user-icon.png"} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <CardContent className="pt-8 pb-4 px-4">
                <div className="mb-3 flex justify-center">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`h-4 w-4 ${i < testimonial.rating ? "text-yellow-400" : "text-gray-300"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <div className="flex justify-center mb-3">
                  <Quote className="text-primary/40 h-8 w-8 rotate-180" />
                </div>
                <p className="mb-4 italic text-center text-muted-foreground min-h-[120px]">"{testimonial.quote}"</p>
                <div className="mt-auto text-center">
                  <p className="font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TestimonialsSection
